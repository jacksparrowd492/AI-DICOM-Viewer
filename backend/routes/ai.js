const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLogger');
const { spawn } = require('child_process');
const path = require('path');
const AIResult = require('../models/AIResult');
const Study = require('../models/Study');
const Series = require('../models/Series');
const Instance = require('../models/Instance');

// @route   POST /api/ai/analyze/:studyUID
// @desc    Run AI analysis on a study
// @access  Private (Radiologist, Admin)
router.post('/analyze/:studyUID',
  protect,
  authorize('admin', 'radiologist'),
  auditLog('RUN_AI_ANALYSIS', 'AIResult'),
  async (req, res) => {
    try {
      const { studyUID } = req.params;

      // Find study
      const study = await Study.findOne({ studyInstanceUID: studyUID });
      if (!study) {
        return res.status(404).json({
          success: false,
          message: 'Study not found'
        });
      }

      // Update study status
      study.status = 'Processing';
      study.aiProcessingStarted = new Date();
      await study.save();

      // Get all series for this study
      const series = await Series.find({ studyInstanceUID: studyUID });
      
      if (!series || series.length === 0) {
        study.status = 'Failed';
        await study.save();
        return res.status(404).json({
          success: false,
          message: 'No series found for this study'
        });
      }

      // Get all instances
      const seriesUIDs = series.map(s => s.seriesInstanceUID);
      const instances = await Instance.find({ 
        seriesInstanceUID: { $in: seriesUIDs } 
      }).sort({ sliceLocation: 1 });

      if (!instances || instances.length === 0) {
        study.status = 'Failed';
        await study.save();
        return res.status(404).json({
          success: false,
          message: 'No instances found for this study'
        });
      }

      // Prepare file paths for AI processing
      const filePaths = instances.map(i => i.filePath);

      // Call Python AI service (simulate for now)
      const aiResult = await runAIAnalysis(filePaths, studyUID);

      // Save AI result
      const result = await AIResult.create({
        studyInstanceUID: studyUID,
        seriesInstanceUID: series[0].seriesInstanceUID,
        modelName: 'BrainTumorCNN',
        modelVersion: '1.0.0',
        prediction: aiResult.prediction,
        confidence: aiResult.confidence,
        probabilities: aiResult.probabilities,
        severity: aiResult.severity,
        riskScore: aiResult.riskScore,
        tumorDetected: aiResult.tumorDetected,
        tumorVolume: aiResult.tumorVolume,
        tumorDimensions: aiResult.tumorDimensions,
        tumorLocation: aiResult.tumorLocation,
        segmentationPerformed: aiResult.segmentationPerformed,
        heatmapUrl: aiResult.heatmapUrl,
        processingTime: aiResult.processingTime,
        slicesAnalyzed: instances.length,
        totalSlices: instances.length,
        imageQuality: aiResult.imageQuality,
        recommendedActions: aiResult.recommendedActions,
        urgencyLevel: aiResult.urgencyLevel
      });

      // Update study
      study.status = 'AI_Analyzed';
      study.aiProcessed = true;
      study.aiProcessingCompleted = new Date();
      await study.save();

      res.json({
        success: true,
        message: 'AI analysis completed',
        result: result
      });

    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Update study status to failed
      await Study.findOneAndUpdate(
        { studyInstanceUID: req.params.studyUID },
        { status: 'Failed' }
      );

      res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: error.message
      });
    }
  }
);

// Simulated AI analysis function
async function runAIAnalysis(filePaths, studyUID) {
  return new Promise((resolve) => {
    // Simulate AI processing time
    setTimeout(() => {
      // Simulate random results
      const predictions = ['No Tumor', 'Glioma', 'Meningioma', 'Pituitary'];
      const prediction = predictions[Math.floor(Math.random() * predictions.length)];
      const confidence = 0.7 + (Math.random() * 0.25); // 0.7 - 0.95
      const tumorDetected = prediction !== 'No Tumor';

      const result = {
        prediction: prediction,
        confidence: confidence,
        probabilities: {
          noTumor: prediction === 'No Tumor' ? confidence : (1 - confidence) / 3,
          glioma: prediction === 'Glioma' ? confidence : (1 - confidence) / 3,
          meningioma: prediction === 'Meningioma' ? confidence : (1 - confidence) / 3,
          pituitary: prediction === 'Pituitary' ? confidence : (1 - confidence) / 3
        },
        severity: tumorDetected ? (confidence > 0.85 ? 'High' : confidence > 0.75 ? 'Medium' : 'Low') : null,
        riskScore: tumorDetected ? Math.round(confidence * 100) : 0,
        tumorDetected: tumorDetected,
        tumorVolume: tumorDetected ? (5 + Math.random() * 20).toFixed(2) : null,
        tumorDimensions: tumorDetected ? {
          width: (10 + Math.random() * 30).toFixed(2),
          height: (10 + Math.random() * 30).toFixed(2),
          depth: (5 + Math.random() * 15).toFixed(2)
        } : null,
        tumorLocation: tumorDetected ? {
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.random() * 100,
          anatomicalRegion: 'Frontal Lobe'
        } : null,
        segmentationPerformed: tumorDetected,
        heatmapUrl: tumorDetected ? `/uploads/heatmaps/${studyUID}_heatmap.png` : null,
        processingTime: 15 + Math.random() * 30,
        imageQuality: 'Good',
        recommendedActions: tumorDetected ? [
          'Immediate radiologist review required',
          'Consider follow-up MRI in 3 months',
          'Consult neurosurgery department'
        ] : ['Regular follow-up recommended'],
        urgencyLevel: tumorDetected ? (confidence > 0.9 ? 'Urgent' : 'Standard') : 'Routine'
      };

      resolve(result);
    }, 3000); // 3 second delay to simulate processing
  });
}

// @route   GET /api/ai/results/:studyUID
// @desc    Get AI results for a study
// @access  Private
router.get('/results/:studyUID',
  protect,
  async (req, res) => {
    try {
      const result = await AIResult.findOne({ studyInstanceUID: req.params.studyUID });
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'No AI results found for this study'
        });
      }

      res.json({
        success: true,
        result: result
      });

    } catch (error) {
      console.error('Get AI result error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   PUT /api/ai/results/:id/review
// @desc    Review and confirm AI result
// @access  Private (Radiologist)
router.put('/results/:id/review',
  protect,
  authorize('radiologist', 'admin'),
  async (req, res) => {
    try {
      const { radiologistNotes, aiAccuracyRating, confirmed } = req.body;

      const result = await AIResult.findByIdAndUpdate(
        req.params.id,
        {
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          radiologistNotes: radiologistNotes,
          aiAccuracyRating: aiAccuracyRating,
          confirmed: confirmed
        },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'AI result not found'
        });
      }

      res.json({
        success: true,
        message: 'AI result reviewed successfully',
        result: result
      });

    } catch (error) {
      console.error('Review AI result error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router;