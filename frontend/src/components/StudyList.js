import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Eye, Filter } from 'lucide-react';
import './StudyList.css';

const StudyList = () => {
  const [studies, setStudies] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    modality: ''
  });
  const [formData, setFormData] = useState({
    studyId: '',
    patient: '',
    studyDate: '',
    modality: 'CT',
    bodyPart: '',
    description: '',
    clinicalHistory: '',
    referringPhysician: '',
    performingPhysician: '',
    priority: 'routine'
  });

  useEffect(() => {
    fetchStudies();
    fetchPatients();
  }, [filters]);

  const fetchStudies = async () => {
    try {
      const response = await axios.get('/studies', {
        params: { 
          status: filters.status,
          modality: filters.modality,
          limit: 100 
        }
      });
      if (response.data.success) {
        setStudies(response.data.studies);
      }
    } catch (error) {
      console.error('Error fetching studies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/patients', { params: { limit: 1000 } });
      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/studies', formData);
      if (response.data.success) {
        alert('Study created successfully');
        fetchStudies();
        handleCloseModal();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating study');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      studyId: '',
      patient: '',
      studyDate: '',
      modality: 'CT',
      bodyPart: '',
      description: '',
      clinicalHistory: '',
      referringPhysician: '',
      performingPhysician: '',
      priority: 'routine'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'scheduled': 'badge-warning',
      'in-progress': 'badge-primary',
      'completed': 'badge-success',
      'reported': 'badge-success',
      'cancelled': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      'routine': 'badge-secondary',
      'urgent': 'badge-warning',
      'stat': 'badge-danger'
    };
    return badges[priority] || 'badge-secondary';
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="study-list">
      <div className="study-list-container">
        <div className="page-header">
          <div>
            <h1>Medical Studies</h1>
            <p>Manage and view all medical imaging studies</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Create Study
          </button>
        </div>

        <div className="filters-bar">
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="reported">Reported</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Modality</label>
            <select
              className="input"
              value={filters.modality}
              onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
            >
              <option value="">All Modalities</option>
              <option value="CT">CT</option>
              <option value="MRI">MRI</option>
              <option value="X-RAY">X-RAY</option>
              <option value="ULTRASOUND">ULTRASOUND</option>
              <option value="PET">PET</option>
              <option value="MAMMOGRAPHY">MAMMOGRAPHY</option>
            </select>
          </div>
        </div>

        {studies.length === 0 ? (
          <div className="empty-state">
            <Search size={48} color="#9ca3af" />
            <p>No studies found</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              Create Your First Study
            </button>
          </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Study ID</th>
                  <th>Patient</th>
                  <th>Modality</th>
                  <th>Body Part</th>
                  <th>Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Images</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studies.map(study => (
                  <tr key={study._id}>
                    <td className="font-medium">{study.studyId}</td>
                    <td>
                      {study.patient ? (
                        <Link to={`/patients/${study.patient._id}`} className="patient-link">
                          {study.patient.firstName} {study.patient.lastName}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <span className="badge badge-secondary">
                        {study.modality}
                      </span>
                    </td>
                    <td>{study.bodyPart}</td>
                    <td>{formatDate(study.studyDate)}</td>
                    <td>
                      <span className={`badge ${getPriorityBadge(study.priority)}`}>
                        {study.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(study.status)}`}>
                        {study.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {study.images?.length || 0}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/studies/${study._id}`}
                        className="btn btn-outline btn-sm"
                      >
                        <Eye size={14} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Study Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <h2>Create New Study</h2>

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Study ID *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.studyId}
                      onChange={(e) => setFormData({ ...formData, studyId: e.target.value })}
                      required
                      placeholder="e.g., STD-2024-001"
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Patient *</label>
                    <select
                      className="input"
                      value={formData.patient}
                      onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                      required
                    >
                      <option value="">Select Patient</option>
                      {patients.map(patient => (
                        <option key={patient._id} value={patient._id}>
                          {patient.firstName} {patient.lastName} ({patient.patientId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Study Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.studyDate}
                      onChange={(e) => setFormData({ ...formData, studyDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Priority *</label>
                    <select
                      className="input"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      required
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Modality *</label>
                    <select
                      className="input"
                      value={formData.modality}
                      onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                      required
                    >
                      <option value="CT">CT Scan</option>
                      <option value="MRI">MRI</option>
                      <option value="X-RAY">X-Ray</option>
                      <option value="ULTRASOUND">Ultrasound</option>
                      <option value="PET">PET Scan</option>
                      <option value="MAMMOGRAPHY">Mammography</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Body Part *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.bodyPart}
                      onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
                      required
                      placeholder="e.g., Chest, Head, Abdomen"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Description *</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Brief description of the study"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Clinical History</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={formData.clinicalHistory}
                    onChange={(e) => setFormData({ ...formData, clinicalHistory: e.target.value })}
                    placeholder="Patient's clinical history and symptoms"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Referring Physician</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.referringPhysician}
                      onChange={(e) => setFormData({ ...formData, referringPhysician: e.target.value })}
                      placeholder="Name of referring physician"
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Performing Physician</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.performingPhysician}
                      onChange={(e) => setFormData({ ...formData, performingPhysician: e.target.value })}
                      placeholder="Name of performing physician"
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Study
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyList;