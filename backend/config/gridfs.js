const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');

let gridFSBucket;

// Initialize GridFS when connection is ready
const initGridFS = () => {
  if (mongoose.connection.readyState === 1) {
    gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'dicomFiles'
    });
    console.log('✓ GridFS Bucket initialized');
    return true;
  }
  return false;
};

// Try to initialize immediately if already connected
if (mongoose.connection.readyState === 1) {
  initGridFS();
}

// Listen for connection event
mongoose.connection.on('open', () => {
  initGridFS();
});

// Create storage WITHOUT deprecated options
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  file: (req, file) => {
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    return {
      filename: filename,
      bucketName: 'dicomFiles',
      metadata: {
        uploadedBy: req.user?._id,
        originalName: file.originalname,
        uploadDate: new Date()
      }
    };
  }
});

// Listen to storage events
storage.on('connection', () => {
  console.log('✓ GridFsStorage connected');
});

storage.on('connectionFailed', (err) => {
  console.error('✗ GridFsStorage connection failed:', err.message);
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/dicom',
      'application/octet-stream',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.toLowerCase().endsWith('.dcm')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DICOM and image files are allowed.'));
    }
  }
});

const getGridFSBucket = () => {
  if (!gridFSBucket) {
    // Try to initialize if not already done
    if (!initGridFS()) {
      throw new Error('GridFS not initialized. MongoDB connection not ready.');
    }
  }
  return gridFSBucket;
};

module.exports = { upload, getGridFSBucket };