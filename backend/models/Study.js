const mongoose = require('mongoose');

const studySchema = new mongoose.Schema({
  studyInstanceUID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true,
    ref: 'Patient'
  },
  studyDate: {
    type: String,
    index: true
  },
  studyTime: String,
  studyDescription: String,
  studyId: String,
  accessionNumber: {
    type: String,
    index: true
  },
  modality: {
    type: String,
    index: true
  },
  referringPhysician: String,
  performingPhysician: String,
  institutionName: String,
  departmentName: String,
  bodyPartExamined: String,
  studyPriority: {
    type: String,
    enum: ['STAT', 'HIGH', 'ROUTINE', 'LOW'],
    default: 'ROUTINE'
  },
  status: {
    type: String,
    enum: ['Uploaded', 'Processing', 'AI_Analyzed', 'Report_Generated', 'Completed', 'Failed'],
    default: 'Uploaded',
    index: true
  },
  seriesCount: {
    type: Number,
    default: 0
  },
  instanceCount: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  aiProcessed: {
    type: Boolean,
    default: false
  },
  aiProcessingStarted: Date,
  aiProcessingCompleted: Date,
  reportGenerated: {
    type: Boolean,
    default: false
  },
  reportGeneratedAt: Date,
  reportGeneratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
studySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
studySchema.index({ patientId: 1, studyDate: -1 });
studySchema.index({ status: 1, createdAt: -1 });
studySchema.index({ modality: 1, studyDate: -1 });

module.exports = mongoose.model('Study', studySchema);