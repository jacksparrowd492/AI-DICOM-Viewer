const AuditLog = require('../models/AuditLog');

// Audit logging middleware
exports.auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function
    res.send = function (data) {
      // Create audit log entry
      AuditLog.create({
        userId: req.user ? req.user._id : null,
        username: req.user ? req.user.username : 'Anonymous',
        action: action,
        resource: resource,
        resourceId: req.params.id || req.body.id || null,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: sanitizeBody(req.body)
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: res.statusCode >= 200 && res.statusCode < 300 ? 'SUCCESS' : 'FAILED'
      }).catch(err => console.error('Audit log error:', err));

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

// Sanitize sensitive data from body
function sanitizeBody(body) {
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'creditCard', 'ssn'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}