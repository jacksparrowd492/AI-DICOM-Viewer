const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { upload, getGridFSBucket } = require('../config/gridfs');
const Study = require('../models/Study');
const dicomParser = require('dicom-parser');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Helper function to parse DICOM metadata
const parseDicomMetadata = async (fileBuffer) => {
  try {
    const dataSet = dicomParser.parseDicom(fileBuffer);
    
    return {
      instanceNumber: dataSet.intString('x00200013') || null,
      seriesNumber: dataSet.intString('x00200011') || null,
      seriesDescription: dataSet.string('x0008103e') || null,
      seriesInstanceUID: dataSet.string('x0020000e') || null,
      sopInstanceUID: dataSet.string('x00080018') || null,
      studyInstanceUID: dataSet.string('x0020000d') || null,
      sliceLocation: dataSet.floatString('x00201041') || null,
      imagePosition: [
        dataSet.floatString('x00200032', 0) || null,
        dataSet.floatString('x00200032', 1) || null,
        dataSet.floatString('x00200032', 2) || null
      ].filter(v => v !== null),
      pixelSpacing: [
        dataSet.floatString('x00280030', 0) || null,
        dataSet.floatString('x00280030', 1) || null
      ].filter(v => v !== null),
      windowCenter: dataSet.floatString('x00281050') || null,
      windowWidth: dataSet.floatString('x00281051') || null,
      acquisitionDate: dataSet.string('x00080022') || null,
      acquisitionTime: dataSet.string('x00080032') || null,
      modality: dataSet.string('x00080060') || null,
      rows: dataSet.uint16('x00280010') || null,
      columns: dataSet.uint16('x00280011') || null
    };
  } catch (error) {
    console.error('Error parsing DICOM:', error);
    return null;
  }
};

// Upload DICOM files with series organization
router.post('/upload/:studyId', upload.array('files', 50), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Study ID:', req.params.studyId);
    console.log('Files:', req.files?.length);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }

    const study = await Study.findById(req.params.studyId);
    if (!study) {
      // Clean up uploaded files
      const gridFSBucket = getGridFSBucket();
      for (const file of req.files) {
        try {
          await gridFSBucket.delete(file.id);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
      
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    console.log('Study found:', study.studyId);

    // Initialize series map
    const seriesMap = new Map();
    const gridFSBucket = getGridFSBucket();
    
    // Process each uploaded file
    for (const file of req.files) {
      let metadata = null;
      
      console.log('Processing file:', file.filename);
      
      // Try to parse DICOM metadata
      if (file.contentType === 'application/dicom' || 
          file.originalname.toLowerCase().endsWith('.dcm')) {
        try {
          // Download file from GridFS to parse
          const chunks = [];
          const downloadStream = gridFSBucket.openDownloadStream(file.id);
          
          for await (const chunk of downloadStream) {
            chunks.push(chunk);
          }
          
          const fileBuffer = Buffer.concat(chunks);
          metadata = await parseDicomMetadata(fileBuffer);
          console.log('DICOM metadata parsed:', metadata?.seriesNumber);
        } catch (error) {
          console.error('Error parsing DICOM file:', error);
        }
      }

      // Use default values if metadata parsing failed
      const seriesNumber = metadata?.seriesNumber || 1;
      const seriesUID = metadata?.seriesInstanceUID || `default-series-${seriesNumber}`;
      const seriesDescription = metadata?.seriesDescription || 'Default Series';

      const imageData = {
        fileId: file.id,
        filename: file.filename,
        contentType: file.contentType || 'application/octet-stream',
        size: file.size,
        uploadDate: new Date(),
        metadata: metadata || {
          instanceNumber: null,
          seriesNumber: seriesNumber,
          seriesDescription: seriesDescription,
          seriesInstanceUID: seriesUID
        }
      };

      // Organize by series
      if (!seriesMap.has(seriesUID)) {
        seriesMap.set(seriesUID, {
          seriesNumber: seriesNumber,
          seriesInstanceUID: seriesUID,
          seriesDescription: seriesDescription,
          modality: metadata?.modality || study.modality,
          images: []
        });
      }
      
      seriesMap.get(seriesUID).images.push(imageData);
    }

    console.log('Series map created with', seriesMap.size, 'series');

    // Update or create series in study
    for (const [seriesUID, seriesData] of seriesMap) {
      const existingSeriesIndex = study.series.findIndex(
        s => s.seriesInstanceUID === seriesUID
      );

      if (existingSeriesIndex >= 0) {
        // Add images to existing series
        study.series[existingSeriesIndex].images.push(...seriesData.images);
        study.series[existingSeriesIndex].numberOfImages = study.series[existingSeriesIndex].images.length;
      } else {
        // Create new series
        study.series.push({
          ...seriesData,
          numberOfImages: seriesData.images.length
        });
      }
    }

    // Sort images within each series by instance number
    study.series.forEach(series => {
      series.images.sort((a, b) => {
        const aInstance = a.metadata?.instanceNumber || 0;
        const bInstance = b.metadata?.instanceNumber || 0;
        return aInstance - bInstance;
      });
    });

    // Sort series by series number
    study.series.sort((a, b) => a.seriesNumber - b.seriesNumber);

    study.status = 'completed';
    await study.save();

    console.log('Study updated successfully');

    res.json({
      success: true,
      message: `${req.files.length} file(s) uploaded and organized into ${seriesMap.size} series`,
      seriesCount: seriesMap.size,
      totalImages: req.files.length,
      study
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading files',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get file by ID
router.get('/download/:fileId', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const gridFSBucket = getGridFSBucket();
    
    const files = await gridFSBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    const file = files[0];

    // Set headers
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.set('Access-Control-Expose-Headers', 'Content-Disposition');

    // Stream file
    const downloadStream = gridFSBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'Error downloading file' 
        });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error downloading file',
      error: error.message 
    });
  }
});

// Get file info
router.get('/info/:fileId', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const gridFSBucket = getGridFSBucket();
    
    const files = await gridFSBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    res.json({
      success: true,
      file: files[0]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching file info',
      error: error.message 
    });
  }
});

// Delete file
router.delete('/:studyId/:fileId', async (req, res) => {
  try {
    const { studyId, fileId } = req.params;
    const fileObjectId = new mongoose.Types.ObjectId(fileId);

    // Remove from study
    const study = await Study.findById(studyId);
    if (!study) {
      return res.status(404).json({ 
        success: false, 
        message: 'Study not found' 
      });
    }

    // Remove from series
    study.series.forEach(series => {
      series.images = series.images.filter(
        img => img.fileId.toString() !== fileId
      );
      series.numberOfImages = series.images.length;
    });

    // Remove empty series
    study.series = study.series.filter(series => series.images.length > 0);

    await study.save();

    // Delete from GridFS
    const gridFSBucket = getGridFSBucket();
    await gridFSBucket.delete(fileObjectId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting file',
      error: error.message 
    });
  }
});

// Get all series for a study
router.get('/study/:studyId/series', async (req, res) => {
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
      series: study.series
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching series',
      error: error.message 
    });
  }
});

module.exports = router;