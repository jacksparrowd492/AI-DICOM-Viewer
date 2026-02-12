const mongoose = require('mongoose');

const aiResultSchema = new mongoose.Schema({
  studyInstanceUID: {
    type: String,
    required: true,
    index: true,
    ref: 'Study'
  },
  seriesInstanceUID: {
    type: String,
    index: true,
    ref: 'Series'
  },
  
  // AI Model Information
  modelName: {
    type: String,
    required: true
  },
  modelVersion: String,
  
  // Prediction Results
  prediction: {
    type: String,
    required: true,
    enum: ['No Tumor', 'Glioma', 'Meningioma', 'Pituitary', 'Uncertain'],
    index: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  probabilities: {
    noTumor: Number,
    glioma: Number,
    meningioma: Number,
    pituitary: Number
  },
  
  // Severity Assessment
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    index: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Tumor Characteristics
  tumorDetected: {
    type: Boolean,
    default: false
  },
  tumorVolume: Number, // in cubic cm
  tumorDimensions: {
    width: Number,
    height: Number,
    depth: Number
  },
  tumorLocation: {
    x: Number,
    y: Number,
    z: Number,
    anatomicalRegion: String
  },
  
  // Segmentation Results
  segmentationPerformed: {
    type: Boolean,
    default: false
  },
  segmentationMaskUrl: String,
  heatmapUrl: String,
  annotatedImagesUrls: [String],
  
  // Additional Findings
  additionalFindings: [{
    finding: String,
    confidence: Number,
    location: String
  }],
  
  // Processing Information
  processingTime: Number, // in seconds
  slicesAnalyzed: Number,
  totalSlices: Number,
  
  // Quality Metrics
  imageQuality: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor']
  },
  artifactsDetected: [String],
  qualityScore: Number,
  
  // Clinical Recommendations
  recommendedActions: [String],
  urgencyLevel: {
    type: String,
    enum: ['Emergency', 'Urgent', 'Standard', 'Routine']
  },
  suggestedFollowUp: String,
  
  // Review Status
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  radiologistNotes: String,
  aiAccuracyRating: {
    type: Number,
    min: 1,
    max: 5
  },
  confirmed: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  analyzedAt: {
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
aiResultSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for efficient queries
aiResultSchema.index({ studyInstanceUID: 1, analyzedAt: -1 });
aiResultSchema.index({ prediction: 1, confidence: -1 });
aiResultSchema.index({ severity: 1, analyzedAt: -1 });

module.exports = mongoose.model('AIResult', aiResultSchema);