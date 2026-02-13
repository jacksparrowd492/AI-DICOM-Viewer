const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware - set up BEFORE routes
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection WITHOUT deprecated options
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✓ MongoDB Connected Successfully');
})
.catch(err => {
  console.error('✗ MongoDB Connection Error:', err);
  console.error('Make sure MongoDB is running: mongod');
});

// MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  console.log('✓ Mongoose connected to MongoDB');
});

// Routes - Define immediately
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/studies', require('./routes/studies'));
app.use('/api/files', require('./routes/files'));
app.use('/api/pacs', require('./routes/pacs'));  // ← ADD THIS LINE
app.use('/api/ai', require('./routes/ai'));
app.use('/api/chat', require('./routes/chat'));

console.log('✓ Routes registered');

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.path);
  res.status(404).json({ 
    success: false, 
    message: `Route not found: ${req.method} ${req.path}` 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\nAvailable routes:`);
  console.log(`  POST http://localhost:${PORT}/api/auth/register`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  GET  http://localhost:${PORT}/api/test`);
  console.log(`  GET  http://localhost:${PORT}/api/files/info/:fileId`);
  console.log(`  GET  http://localhost:${PORT}/api/pacs/series/:seriesUID`);
  console.log(`  GET  http://localhost:${PORT}/api/pacs/files/info/:fileId`);
  console.log(`  GET  http://localhost:${PORT}/api/pacs/files/stream/:fileId`);
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

module.exports = app;