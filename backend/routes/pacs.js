const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLogger');
const Patient = require('../models/Patient');
const Study = require('../models/Study');
const Series = require('../models/Series');
const Instance = require('../models/Instance');
const AIResult = require('../models/AIResult');

// @route   GET /api/pacs/studies/search
// @desc    Search studies with filters
// @access  Private
router.get('/studies/search',
  protect,
  async (req, res) => {
    try {
      const {
        patientName,
        patientId,
        studyDate,
        studyDateFrom,
        studyDateTo,
        modality,
        accessionNumber,
        status,
        bodyPart,
        limit = 50,
        skip = 0,
        sortBy = 'studyDate',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      let query = {};

      if (patientId) {
        query.patientId = { $regex: patientId, $options: 'i' };
      }

      if (studyDate) {
        query.studyDate = studyDate;
      }

      if (studyDateFrom || studyDateTo) {
        query.studyDate = {};
        if (studyDateFrom) query.studyDate.$gte = studyDateFrom;
        if (studyDateTo) query.studyDate.$lte = studyDateTo;
      }

      if (modality && modality !== 'All Modalities' && modality !== '') {
        query.modality = modality;
      }

      if (accessionNumber) {
        query.accessionNumber = { $regex: accessionNumber, $options: 'i' };
      }

      if (status) {
        query.status = status;
      }

      if (bodyPart) {
        query.bodyPartExamined = { $regex: bodyPart, $options: 'i' };
      }

      // Execute query
      const studies = await Study.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();

      // Get total count
      const total = await Study.countDocuments(query);

      // Enrich with patient data and AI results
      const enrichedStudies = await Promise.all(
        studies.map(async (study) => {
          const patient = await Patient.findOne({ patientId: study.patientId });
          const aiResult = await AIResult.findOne({ studyInstanceUID: study.studyInstanceUID });
          
          return {
            ...study,
            patientName: patient?.patientName || 'Unknown',
            patientGender: patient?.gender,
            patientAge: patient?.calculateAge(),
            aiPrediction: aiResult?.prediction,
            aiConfidence: aiResult?.confidence,
            aiSeverity: aiResult?.severity,
            tumorDetected: aiResult?.tumorDetected
          };
        })
      );

      res.json({
        success: true,
        count: enrichedStudies.length,
        total: total,
        studies: enrichedStudies
      });

    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during search'
      });
    }
  }
);

// @route   GET /api/pacs/studies/:studyUID
// @desc    Get study details
// @access  Private
router.get('/studies/:studyUID',
  protect,
  auditLog('VIEW_STUDY', 'Study'),
  async (req, res) => {
    try {
      const study = await Study.findOne({ studyInstanceUID: req.params.studyUID });
      
      if (!study) {
        return res.status(404).json({
          success: false,
          message: 'Study not found'
        });
      }

      const patient = await Patient.findOne({ patientId: study.patientId });
      const series = await Series.find({ studyInstanceUID: req.params.studyUID }).sort({ seriesNumber: 1 });
      const aiResult = await AIResult.findOne({ studyInstanceUID: req.params.studyUID });

      res.json({
        success: true,
        study: {
          ...study.toObject(),
          patientName: patient?.patientName,
          patientGender: patient?.gender,
          patientDateOfBirth: patient?.dateOfBirth,
          patientAge: patient?.calculateAge()
        },
        patient: patient,
        series: series,
        aiResult: aiResult
      });

    } catch (error) {
      console.error('Get study error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   GET /api/pacs/series/:seriesUID
// @desc    Get series details
// @access  Private
router.get('/series/:seriesUID',
  protect,
  auditLog('VIEW_SERIES', 'Series'),
  async (req, res) => {
    try {
      const series = await Series.findOne({ seriesInstanceUID: req.params.seriesUID });
      
      if (!series) {
        return res.status(404).json({
          success: false,
          message: 'Series not found'
        });
      }

      res.json({
        success: true,
        series: series
      });

    } catch (error) {
      console.error('Get series error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   GET /api/pacs/series/:seriesUID/instances
// @desc    Get all instances in a series
// @access  Private
router.get('/series/:seriesUID/instances',
  protect,
  async (req, res) => {
    try {
      const instances = await Instance.find({ seriesInstanceUID: req.params.seriesUID })
        .sort({ instanceNumber: 1 })
        .lean();

      if (!instances || instances.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No instances found for this series'
        });
      }

      res.json({
        success: true,
        count: instances.length,
        instances: instances
      });

    } catch (error) {
      console.error('Get instances error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   GET /api/pacs/instance/:instanceUID
// @desc    Get instance details
// @access  Private
router.get('/instance/:instanceUID',
  protect,
  auditLog('VIEW_INSTANCE', 'Instance'),
  async (req, res) => {
    try {
      const instance = await Instance.findOne({ sopInstanceUID: req.params.instanceUID });
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instance not found'
        });
      }

      res.json({
        success: true,
        instance: instance
      });

    } catch (error) {
      console.error('Get instance error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   GET /api/pacs/patients
// @desc    Get all patients
// @access  Private
router.get('/patients',
  protect,
  async (req, res) => {
    try {
      const { search, limit = 50, skip = 0 } = req.query;
      
      let query = {};
      if (search) {
        query.$or = [
          { patientName: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } }
        ];
      }

      const patients = await Patient.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await Patient.countDocuments(query);

      res.json({
        success: true,
        count: patients.length,
        total: total,
        patients: patients
      });

    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   GET /api/pacs/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard/stats',
  protect,
  async (req, res) => {
    try {
      const totalStudies = await Study.countDocuments();
      const totalPatients = await Patient.countDocuments();
      const totalSeries = await Series.countDocuments();
      const totalInstances = await Instance.countDocuments();

      // AI Statistics
      const aiResults = await AIResult.find();
      const tumorCases = aiResults.filter(r => r.tumorDetected).length;
      const tumorPercentage = totalStudies > 0 ? ((tumorCases / totalStudies) * 100).toFixed(2) : 0;

      // Tumor type distribution
      const tumorTypes = await AIResult.aggregate([
        { $match: { tumorDetected: true } },
        { $group: { _id: '$prediction', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Recent studies
      const recentStudies = await Study.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const enrichedRecentStudies = await Promise.all(
        recentStudies.map(async (study) => {
          const patient = await Patient.findOne({ patientId: study.patientId });
          return {
            ...study,
            patientName: patient?.patientName || 'Unknown'
          };
        })
      );

      // Modality distribution
      const modalityDistribution = await Study.aggregate([
        { $group: { _id: '$modality', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        stats: {
          totalStudies,
          totalPatients,
          totalSeries,
          totalInstances,
          tumorCases,
          tumorPercentage,
          tumorTypes,
          recentStudies: enrichedRecentStudies,
          modalityDistribution
        }
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;