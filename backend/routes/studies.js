const express = require('express');
const { body, validationResult } = require('express-validator');
const Study = require('../models/Study');
const Patient = require('../models/Patient');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get all studies
router.get('/', async (req, res) => {
  try {
    const { patientId, status, modality, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (patientId) {
      query.patient = patientId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (modality) {
      query.modality = modality;
    }

    const studies = await Study.find(query)
      .sort({ studyDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('patient', 'firstName lastName patientId dateOfBirth gender')
      .populate('createdBy', 'firstName lastName')
      .populate('reportedBy', 'firstName lastName');

    const count = await Study.countDocuments(query);

    res.json({
      success: true,
      studies,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching studies',
      error: error.message 
    });
  }
});

// Get study by ID
router.get('/:id', async (req, res) => {
  try {
    const study = await Study.findById(req.params.id)
      .populate('patient')
      .populate('createdBy', 'firstName lastName')
      .populate('reportedBy', 'firstName lastName');

    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    res.json({
      success: true,
      study
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching study',
      error: error.message 
    });
  }
});

// Create study
router.post('/', [
  body('studyId').notEmpty().withMessage('Study ID is required'),
  body('patient').notEmpty().withMessage('Patient ID is required'),
  body('studyDate').isISO8601().withMessage('Valid study date is required'),
  body('modality').notEmpty().withMessage('Modality is required'),
  body('bodyPart').notEmpty().withMessage('Body part is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Check if patient exists
    const patient = await Patient.findById(req.body.patient);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    // Check if study ID already exists
    const existingStudy = await Study.findOne({ studyId: req.body.studyId });
    if (existingStudy) {
      return res.status(400).json({ 
        success: false, 
        message: 'Study ID already exists' 
      });
    }

    const study = new Study({
      ...req.body,
      createdBy: req.user._id
    });

    await study.save();

    const populatedStudy = await Study.findById(study._id)
      .populate('patient')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Study created successfully',
      study: populatedStudy
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating study',
      error: error.message 
    });
  }
});

// Update study
router.put('/:id', async (req, res) => {
  try {
    const study = await Study.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
    .populate('patient')
    .populate('createdBy', 'firstName lastName')
    .populate('reportedBy', 'firstName lastName');

    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    res.json({
      success: true,
      message: 'Study updated successfully',
      study
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating study',
      error: error.message 
    });
  }
});

// Add report to study
router.put('/:id/report', [
  body('findings').notEmpty().withMessage('Findings are required'),
  body('impression').notEmpty().withMessage('Impression is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { findings, impression, recommendations } = req.body;

    const study = await Study.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          findings,
          impression,
          recommendations,
          status: 'reported',
          reportedBy: req.user._id,
          reportedAt: new Date()
        }
      },
      { new: true }
    )
    .populate('patient')
    .populate('createdBy', 'firstName lastName')
    .populate('reportedBy', 'firstName lastName');

    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    res.json({
      success: true,
      message: 'Report added successfully',
      study
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error adding report',
      error: error.message 
    });
  }
});

// Delete study
router.delete('/:id', async (req, res) => {
  try {
    const study = await Study.findByIdAndDelete(req.params.id);

    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    // TODO: Delete associated files from GridFS

    res.json({
      success: true,
      message: 'Study deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting study',
      error: error.message 
    });
  }
});

module.exports = router;