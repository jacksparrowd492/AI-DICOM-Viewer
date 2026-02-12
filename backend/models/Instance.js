const mongoose = require('mongoose');

const instanceSchema = new mongoose.Schema({
  sopInstanceUID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  seriesInstanceUID: {
    type: String,
    required: true,
    index: true,
    ref: 'Series'
  },
  instanceNumber: {
    type: Number,
    index: true
  },
  sopClassUID: String,
  transferSyntaxUID: String,
  
  // File storage information
  filePath: {
    type: String,
    required: true
  },
  fileName: String,
  fileSize: Number,
  fileUrl: String,
  cloudStorageUrl: String,
  cloudStorageKey: String,
  
  // Image information
  rows: Number,
  columns: Number,
  bitsAllocated: Number,
  bitsStored: Number,
  highBit: Number,
  pixelRepresentation: Number,
  samplesPerPixel: Number,
  photometricInterpretation: String,
  
  // Spatial information
  sliceLocation: Number,
  sliceThickness: Number,
  imagePosition: [Number],
  imageOrientation: [Number],
  pixelSpacing: [Number],
  
  // Acquisition information
  acquisitionNumber: Number,
  acquisitionDate: String,
  acquisitionTime: String,
  contentDate: String,
  contentTime: String,
  
  // Display information
  windowCenter: Number,
  windowWidth: Number,
  rescaleIntercept: Number,
  rescaleSlope: Number,
  
  // Processing status
  processed: {
    type: Boolean,
    default: false
  },
  thumbnailGenerated: {
    type: Boolean,
    default: false
  },
  thumbnailPath: String,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
instanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
instanceSchema.index({ seriesInstanceUID: 1, instanceNumber: 1 });
instanceSchema.index({ sliceLocation: 1 });

module.exports = mongoose.model('Instance', instanceSchema);