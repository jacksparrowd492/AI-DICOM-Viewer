const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  instanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instance',
    required: true,
    index: true
  },
  sopInstanceUID: {
    type: String,
    required: true,
    index: true
  },
  studyInstanceUID: {
    type: String,
    required: true,
    index: true
  },
  
  // Annotation Type
  annotationType: {
    type: String,
    enum: ['point', 'line', 'rectangle', 'ellipse', 'polygon', 'freehand', 'text', 'arrow'],
    required: true
  },
  
  // Coordinates
  coordinates: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Styling
  color: {
    type: String,
    default: '#FF0000'
  },
  lineWidth: {
    type: Number,
    default: 2
  },
  
  // Content
  label: String,
  description: String,
  measurements: {
    length: Number,
    area: Number,
    volume: Number,
    unit: String
  },
  
  // Classification
  category: {
    type: String,
    enum: ['tumor', 'lesion', 'abnormality', 'normal', 'artifact', 'measurement', 'other']
  },
  
  // User Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // AI-generated
  aiGenerated: {
    type: Boolean,
    default: false
  },
  confidence: Number,
  
  // Visibility
  visible: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
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
annotationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Annotation', annotationSchema);