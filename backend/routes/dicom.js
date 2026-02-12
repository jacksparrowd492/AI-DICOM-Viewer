const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { protect, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLogger');
const DicomService = require('../services/dicom/dicomService');
const Patient = require('../models/Patient');
const Study = require('../models/Study');
const Series = require('../models/Series');
const Instance = require('../models/Instance');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/dicom');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept DICOM files (usually .dcm or no extension)
  const allowedExts = ['.dcm', '.dicom', '.DCM', '.DICOM', ''];
  const ext = path.extname(file.originalname);
  
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only DICOM files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// @route   POST /api/dicom/upload
// @desc    Upload DICOM files
// @access  Private (Admin, Radiologist)
router.post('/upload', 
  protect, 
  authorize('admin', 'radiologist'),
  upload.array('dicomFiles', 50),
  auditLog('UPLOAD_DICOM', 'Instance'),
  async (req, res) => {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const results = {
        success: [],
        failed: []
      };

      // Process each file
      for (const file of files) {
        try {
          // Extract metadata
          const metadata = await DicomService.extractMetadata(file.path);
          
          // Create or update Patient
          let patient = await Patient.findOne({ patientId: metadata.patientId });
          if (!patient) {
            patient = await Patient.create({
              patientId: metadata.patientId,
              patientName: metadata.patientName,
              gender: metadata.gender,
              dateOfBirth: metadata.dateOfBirth ? new Date(
                metadata.dateOfBirth.substring(0, 4),
                parseInt(metadata.dateOfBirth.substring(4, 6)) - 1,
                metadata.dateOfBirth.substring(6, 8)
              ) : null
            });
          }

          // Create or update Study
          let study = await Study.findOne({ studyInstanceUID: metadata.studyInstanceUID });
          if (!study) {
            study = await Study.create({
              studyInstanceUID: metadata.studyInstanceUID,
              patientId: metadata.patientId,
              studyDate: metadata.studyDate,
              studyTime: metadata.studyTime,
              studyDescription: metadata.studyDescription,
              studyId: metadata.studyId,
              accessionNumber: metadata.accessionNumber,
              modality: metadata.modality,
              referringPhysician: metadata.referringPhysician,
              performingPhysician: metadata.performingPhysician,
              institutionName: metadata.institutionName,
              departmentName: metadata.departmentName,
              bodyPartExamined: metadata.bodyPartExamined,
              uploadedBy: req.user._id
            });
          }

          // Create or update Series
          let series = await Series.findOne({ seriesInstanceUID: metadata.seriesInstanceUID });
          if (!series) {
            series = await Series.create({
              seriesInstanceUID: metadata.seriesInstanceUID,
              studyInstanceUID: metadata.studyInstanceUID,
              seriesNumber: metadata.seriesNumber,
              seriesDescription: metadata.seriesDescription,
              seriesDate: metadata.seriesDate,
              seriesTime: metadata.seriesTime,
              modality: metadata.modality,
              bodyPartExamined: metadata.bodyPartExamined,
              manufacturer: metadata.manufacturer,
              manufacturerModelName: metadata.manufacturerModelName,
              stationName: metadata.stationName,
              rows: metadata.rows,
              columns: metadata.columns,
              bitsAllocated: metadata.bitsAllocated,
              bitsStored: metadata.bitsStored,
              windowCenter: metadata.windowCenter,
              windowWidth: metadata.windowWidth,
              rescaleIntercept: metadata.rescaleIntercept,
              rescaleSlope: metadata.rescaleSlope
            });
          }

          // Create Instance
          const instance = await Instance.create({
            sopInstanceUID: metadata.sopInstanceUID,
            seriesInstanceUID: metadata.seriesInstanceUID,
            instanceNumber: metadata.instanceNumber,
            sopClassUID: metadata.sopClassUID,
            filePath: file.path,
            fileName: file.filename,
            fileSize: metadata.fileSize,
            fileUrl: `/uploads/dicom/${file.filename}`,
            rows: metadata.rows,
            columns: metadata.columns,
            bitsAllocated: metadata.bitsAllocated,
            bitsStored: metadata.bitsStored,
            sliceLocation: metadata.sliceLocation,
            sliceThickness: metadata.sliceThickness,
            imagePosition: metadata.imagePosition,
            imageOrientation: metadata.imageOrientation,
            pixelSpacing: metadata.pixelSpacing,
            windowCenter: metadata.windowCenter,
            windowWidth: metadata.windowWidth,
            rescaleIntercept: metadata.rescaleIntercept,
            rescaleSlope: metadata.rescaleSlope,
            metadata: metadata
          });

          // Update counts
          await Series.findByIdAndUpdate(series._id, {
            $inc: { instanceCount: 1 }
          });

          await Study.findByIdAndUpdate(study._id, {
            $inc: { instanceCount: 1 }
          });

          results.success.push({
            fileName: file.originalname,
            instanceId: instance._id,
            sopInstanceUID: metadata.sopInstanceUID
          });

        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          
          // Delete the file if processing failed
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
          }

          results.failed.push({
            fileName: file.originalname,
            error: error.message
          });
        }
      }

      // Update series and study counts
      const uniqueStudies = [...new Set(results.success.map(r => r.studyInstanceUID))];
      for (const studyUID of uniqueStudies) {
        const seriesCount = await Series.countDocuments({ studyInstanceUID: studyUID });
        await Study.findOneAndUpdate(
          { studyInstanceUID: studyUID },
          { seriesCount: seriesCount }
        );
      }

      res.json({
        success: true,
        message: `Processed ${files.length} files`,
        results: {
          total: files.length,
          succeeded: results.success.length,
          failed: results.failed.length,
          details: results
        }
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during upload',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/dicom/instance/:id
// @desc    Delete DICOM instance
// @access  Private (Admin only)
router.delete('/instance/:id',
  protect,
  authorize('admin'),
  auditLog('DELETE_DICOM', 'Instance'),
  async (req, res) => {
    try {
      const instance = await Instance.findById(req.params.id);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: 'Instance not found'
        });
      }

      // Delete physical file
      try {
        await fs.unlink(instance.filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }

      // Delete from database
      await instance.deleteOne();

      // Update counts
      await Series.findOneAndUpdate(
        { seriesInstanceUID: instance.seriesInstanceUID },
        { $inc: { instanceCount: -1 } }
      );

      const series = await Series.findOne({ seriesInstanceUID: instance.seriesInstanceUID });
      if (series) {
        await Study.findOneAndUpdate(
          { studyInstanceUID: series.studyInstanceUID },
          { $inc: { instanceCount: -1 } }
        );
      }

      res.json({
        success: true,
        message: 'Instance deleted successfully'
      });

    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during deletion'
      });
    }
  }
);

module.exports = router;