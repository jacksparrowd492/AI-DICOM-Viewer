const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  username: String,
  
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'UPLOAD_DICOM', 'DELETE_DICOM', 'DOWNLOAD_DICOM',
      'VIEW_STUDY', 'VIEW_SERIES', 'VIEW_INSTANCE',
      'RUN_AI_ANALYSIS', 'REVIEW_AI_RESULT',
      'GENERATE_REPORT', 'DOWNLOAD_REPORT',
      'CREATE_ANNOTATION', 'UPDATE_ANNOTATION', 'DELETE_ANNOTATION',
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'UPDATE_PATIENT', 'DELETE_PATIENT',
      'EXPORT_STUDY', 'SHARE_STUDY',
      'SETTINGS_CHANGED', 'OTHER'
    ],
    index: true
  },
  
  resource: {
    type: String,
    enum: ['User', 'Patient', 'Study', 'Series', 'Instance', 'AIResult', 'Report', 'Annotation', 'System'],
    index: true
  },
  resourceId: String,
  
  details: mongoose.Schema.Types.Mixed,
  
  ipAddress: String,
  userAgent: String,
  
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS',
    index: true
  },
  errorMessage: String,
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// TTL Index - Auto-delete logs older than 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);