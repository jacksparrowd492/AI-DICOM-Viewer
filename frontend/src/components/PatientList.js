import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Eye, Edit, Trash2, User } from 'lucide-react';
import './PatientList.css';

const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [formData, setFormData] = useState({
    patientId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Male',
    email: '',
    phone: '',
    bloodGroup: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  useEffect(() => {
    fetchPatients();
  }, [search]);

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/patients', {
        params: { search, limit: 100 }
      });
      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentPatient) {
        // Update
        const response = await axios.put(`/patients/${currentPatient._id}`, formData);
        if (response.data.success) {
          alert('Patient updated successfully');
          fetchPatients();
          handleCloseModal();
        }
      } else {
        // Create
        const response = await axios.post('/patients', formData);
        if (response.data.success) {
          alert('Patient created successfully');
          fetchPatients();
          handleCloseModal();
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving patient');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        const response = await axios.delete(`/patients/${id}`);
        if (response.data.success) {
          alert('Patient deleted successfully');
          fetchPatients();
        }
      } catch (error) {
        alert('Error deleting patient');
      }
    }
  };

  const handleEdit = (patient) => {
    setCurrentPatient(patient);
    setFormData({
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth.split('T')[0],
      gender: patient.gender,
      email: patient.email || '',
      phone: patient.phone || '',
      bloodGroup: patient.bloodGroup || '',
      address: patient.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentPatient(null);
    setFormData({
      patientId: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'Male',
      email: '',
      phone: '',
      bloodGroup: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    });
  };

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="patient-list">
      <div className="patient-list-container">
        <div className="page-header">
          <div>
            <h1>Patients</h1>
            <p>Manage patient records</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Add Patient
          </button>
        </div>

        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search patients by name, ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {patients.length === 0 ? (
          <div className="empty-state">
            <User size={48} color="#9ca3af" />
            <p>No patients found</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              Add Your First Patient
            </button>
          </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age/Gender</th>
                  <th>Contact</th>
                  <th>Blood Group</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(patient => (
                  <tr key={patient._id}>
                    <td className="font-medium">{patient.patientId}</td>
                    <td>
                      <div className="patient-name">
                        {patient.firstName} {patient.lastName}
                      </div>
                    </td>
                    <td>
                      {calculateAge(patient.dateOfBirth)} yrs / {patient.gender}
                    </td>
                    <td>
                      <div className="contact-info">
                        {patient.email && <div>{patient.email}</div>}
                        {patient.phone && <div>{patient.phone}</div>}
                      </div>
                    </td>
                    <td>
                      {patient.bloodGroup ? (
                        <span className="badge badge-secondary">
                          {patient.bloodGroup}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link
                          to={`/patients/${patient._id}`}
                          className="btn-icon"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          className="btn-icon"
                          onClick={() => handleEdit(patient)}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDelete(patient._id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{currentPatient ? 'Edit Patient' : 'Add New Patient'}</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Patient ID *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.patientId}
                      onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      required
                      disabled={currentPatient !== null}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Blood Group</label>
                    <select
                      className="input"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">First Name *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Last Name *</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Date of Birth *</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Gender *</label>
                    <select
                      className="input"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      required
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Phone</label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Street Address</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">City</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.address.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">State</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.address.state}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="label">ZIP Code</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, zipCode: e.target.value }
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Country</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.address.country}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, country: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {currentPatient ? 'Update Patient' : 'Create Patient'}
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

export default PatientList;