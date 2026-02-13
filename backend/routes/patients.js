const express = require('express');
const { body, validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get all patients
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName');

    const count = await Patient.countDocuments(query);

    res.json({
      success: true,
      patients,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching patients',
      error: error.message 
    });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      patient
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching patient',
      error: error.message 
    });
  }
});

// Create patient
router.post('/', [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Check if patient ID already exists
    const existingPatient = await Patient.findOne({ patientId: req.body.patientId });
    if (existingPatient) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient ID already exists' 
      });
    }

    const patient = new Patient({
      ...req.body,
      createdBy: req.user._id
    });

    await patient.save();

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      patient
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating patient',
      error: error.message 
    });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating patient',
      error: error.message 
    });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting patient',
      error: error.message 
    });
  }
});

module.exports = router;