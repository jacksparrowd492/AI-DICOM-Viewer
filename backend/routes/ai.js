const express = require('express');
const { auth } = require('../middleware/auth');
const Study = require('../models/Study');
const mongoose = require('mongoose');
const { gridFSBucket } = require('../config/gridfs');

const router = express.Router();

router.use(auth);

// Mock AI prediction function (replace with actual AI model)
const predictTumor = async (imageBuffer) => {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock prediction results
  const hasTumor = Math.random() > 0.5;
  const confidence = hasTumor ? 0.75 + Math.random() * 0.24 : 0.1 + Math.random() * 0.4;
  
  const tumorTypes = ['Glioblastoma', 'Meningioma', 'Pituitary Adenoma', 'Astrocytoma'];
  const severities = ['Low', 'Medium', 'High'];
  
  return {
    hasTumor,
    confidence: Math.round(confidence * 100) / 100,
    tumorType: hasTumor ? tumorTypes[Math.floor(Math.random() * tumorTypes.length)] : null,
    location: hasTumor ? {
      x: Math.floor(Math.random() * 400),
      y: Math.floor(Math.random() * 400),
      width: 50 + Math.floor(Math.random() * 100),
      height: 50 + Math.floor(Math.random() * 100)
    } : null,
    severity: hasTumor ? severities[Math.floor(Math.random() * severities.length)] : null,
    annotations: {
      notes: hasTumor ? 'Abnormal mass detected in brain tissue' : 'No significant abnormalities detected',
      recommendations: hasTumor ? 'Further analysis recommended. Consider biopsy.' : 'Continue routine monitoring'
    }
  };
};

// Predict tumor for a specific image
router.post('/predict/:studyId/:seriesId/:imageId', async (req, res) => {
  try {
    const { studyId, seriesId, imageId } = req.params;
    
    const study = await Study.findById(studyId);
    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    // Find the series
    const series = study.series.id(seriesId);
    if (!series) {
      return res.status(404).json({ 
        success: false, 
        message: 'Series not found' 
      });
    }

    // Find the image
    const image = series.images.id(imageId);
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

    // Download image from GridFS
    const chunks = [];
    const downloadStream = gridFSBucket.openDownloadStream(image.fileId);
    
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    
    const imageBuffer = Buffer.concat(chunks);

    // Run AI prediction
    const prediction = await predictTumor(imageBuffer);

    // Save prediction to study
    study.aiPredictions.push({
      seriesId: seriesId,
      imageId: imageId,
      predictionType: 'tumor_detection',
      result: prediction,
      modelVersion: '1.0.0',
      processedAt: new Date()
    });

    await study.save();

    res.json({
      success: true,
      message: 'AI prediction completed',
      prediction: {
        ...prediction,
        imageId,
        seriesId
      }
    });
  } catch (error) {
    console.error('AI Prediction error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing AI prediction',
      error: error.message 
    });
  }
});

// Get all predictions for a study
router.get('/predictions/:studyId', async (req, res) => {
  try {
    const study = await Study.findById(req.params.studyId);
    
    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    res.json({
      success: true,
      predictions: study.aiPredictions
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching predictions',
      error: error.message 
    });
  }
});

// Batch predict for entire series
router.post('/predict-series/:studyId/:seriesId', async (req, res) => {
  try {
    const { studyId, seriesId } = req.params;
    
    const study = await Study.findById(studyId);
    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    const series = study.series.id(seriesId);
    if (!series) {
      return res.status(404).json({ 
        success: false, 
        message: 'Series not found' 
      });
    }

    const predictions = [];

    // Process each image in the series
    for (const image of series.images) {
      try {
        // Download image
        const chunks = [];
        const downloadStream = gridFSBucket.openDownloadStream(image.fileId);
        
        for await (const chunk of downloadStream) {
          chunks.push(chunk);
        }
        
        const imageBuffer = Buffer.concat(chunks);
        
        // Run prediction
        const prediction = await predictTumor(imageBuffer);
        
        // Save prediction
        study.aiPredictions.push({
          seriesId: seriesId,
          imageId: image._id,
          predictionType: 'tumor_detection',
          result: prediction,
          modelVersion: '1.0.0',
          processedAt: new Date()
        });

        predictions.push({
          imageId: image._id,
          ...prediction
        });
      } catch (err) {
        console.error(`Error predicting image ${image._id}:`, err);
      }
    }

    await study.save();

    res.json({
      success: true,
      message: `Processed ${predictions.length} images`,
      predictions
    });
  } catch (error) {
    console.error('Batch prediction error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing batch prediction',
      error: error.message 
    });
  }
});

module.exports = router;