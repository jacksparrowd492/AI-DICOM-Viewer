const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
  seriesInstanceUID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studyInstanceUID: {
    type: String,
    required: true,
    index: true,
    ref: 'Study'
  },
  seriesNumber: {
    type: Number,
    index: true
  },
  seriesDescription: String,
  seriesDate: String,
  seriesTime: String,
  modality: String,
  bodyPartExamined: String,
  protocolName: String,
  operatorName: String,
  performingPhysician: String,
  instanceCount: {
    type: Number,
    default: 0
  },
  numberOfSlices: Number,
  sliceThickness: Number,
  pixelSpacing: [Number],
  imageOrientation: [Number],
  imagePosition: [Number],
  acquisitionDate: String,
  acquisitionTime: String,
  manufacturer: String,
  manufacturerModelName: String,
  stationName: String,
  softwareVersion: String,
  contrastAgent: String,
  scanningSequence: String,
  sequenceVariant: String,
  scanOptions: String,
  mrAcquisitionType: String,
  sliceLocation: Number,
  samplesPerPixel: Number,
  photometricInterpretation: String,
  rows: Number,
  columns: Number,
  bitsAllocated: Number,
  bitsStored: Number,
  highBit: Number,
  pixelRepresentation: Number,
  windowCenter: Number,
  windowWidth: Number,
  rescaleIntercept: Number,
  rescaleSlope: Number,
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
seriesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
seriesSchema.index({ studyInstanceUID: 1, seriesNumber: 1 });

module.exports = mongoose.model('Series', seriesSchema);