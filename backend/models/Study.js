const mongoose = require('mongoose');

const studySchema = new mongoose.Schema({
  studyId: {
    type: String,
    required: true,
    unique: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  studyDate: {
    type: Date,
    required: true
  },
  modality: {
    type: String,
    required: true,
    enum: ['CT', 'MRI', 'X-RAY', 'ULTRASOUND', 'PET', 'MAMMOGRAPHY', 'OTHER']
  },
  bodyPart: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  clinicalHistory: String,
  referringPhysician: String,
  performingPhysician: String,
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'reported', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine'
  },
  findings: String,
  impression: String,
  recommendations: String,
  images: [{
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    filename: String,
    contentType: String,
    size: Number,
    uploadDate: Date,
    metadata: {
      instanceNumber: Number,
      sliceLocation: Number,
      imagePosition: [Number],
      pixelSpacing: [Number],
      windowCenter: Number,
      windowWidth: Number,
      tags: mongoose.Schema.Types.Mixed
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
studySchema.index({ patient: 1, studyDate: -1 });
studySchema.index({ studyId: 1 });
studySchema.index({ status: 1 });

module.exports = mongoose.model('Study', studySchema);