import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Mail, Phone, Calendar, Droplet, MapPin, FileText } from 'lucide-react';
import './PatientDetails.css';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientDetails();
    fetchPatientStudies();
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      const response = await axios.get(`/patients/${id}`);
      if (response.data.success) {
        setPatient(response.data.patient);
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      alert('Error loading patient details');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientStudies = async () => {
    try {
      const response = await axios.get('/studies', {
        params: { patientId: id }
      });
      if (response.data.success) {
        setStudies(response.data.studies);
      }
    } catch (error) {
      console.error('Error fetching studies:', error);
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  if (loading) {
    return <div className="spinner"></div>;
  }

  if (!patient) {
    return <div>Patient not found</div>;
  }

  return (
    <div className="patient-details">
      <div className="patient-details-container">
        <div className="details-header">
          <button className="btn btn-outline" onClick={() => navigate('/patients')}>
            <ArrowLeft size={18} />
            Back to Patients
          </button>
        </div>

        <div className="patient-profile">
          <div className="profile-card">
            <div className="profile-avatar">
              <User size={48} />
            </div>
            <div className="profile-info">
              <h1>{patient.firstName} {patient.lastName}</h1>
              <div className="profile-meta">
                <span className="badge badge-primary">ID: {patient.patientId}</span>
                <span>{calculateAge(patient.dateOfBirth)} years old</span>
                <span>{patient.gender}</span>
              </div>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon">
                <Calendar size={20} color="#3b82f6" />
              </div>
              <div>
                <div className="info-label">Date of Birth</div>
                <div className="info-value">{formatDate(patient.dateOfBirth)}</div>
              </div>
            </div>

            {patient.email && (
              <div className="info-card">
                <div className="info-icon">
                  <Mail size={20} color="#10b981" />
                </div>
                <div>
                  <div className="info-label">Email</div>
                  <div className="info-value">{patient.email}</div>
                </div>
              </div>
            )}

            {patient.phone && (
              <div className="info-card">
                <div className="info-icon">
                  <Phone size={20} color="#f59e0b" />
                </div>
                <div>
                  <div className="info-label">Phone</div>
                  <div className="info-value">{patient.phone}</div>
                </div>
              </div>
            )}

            {patient.bloodGroup && (
              <div className="info-card">
                <div className="info-icon">
                  <Droplet size={20} color="#ef4444" />
                </div>
                <div>
                  <div className="info-label">Blood Group</div>
                  <div className="info-value">{patient.bloodGroup}</div>
                </div>
              </div>
            )}
          </div>

          {patient.address && (patient.address.street || patient.address.city) && (
            <div className="card">
              <div className="card-header">
                <MapPin size={20} />
                <h3>Address</h3>
              </div>
              <div className="address-content">
                {patient.address.street && <div>{patient.address.street}</div>}
                <div>
                  {patient.address.city && `${patient.address.city}, `}
                  {patient.address.state && `${patient.address.state} `}
                  {patient.address.zipCode}
                </div>
                {patient.address.country && <div>{patient.address.country}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="studies-section">
          <div className="section-header">
            <h2>
              <FileText size={24} />
              Medical Studies ({studies.length})
            </h2>
          </div>

          {studies.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} color="#9ca3af" />
              <p>No studies found for this patient</p>
            </div>
          ) : (
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Study ID</th>
                    <th>Modality</th>
                    <th>Body Part</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map(study => (
                    <tr key={study._id}>
                      <td className="font-medium">{study.studyId}</td>
                      <td>
                        <span className="badge badge-secondary">
                          {study.modality}
                        </span>
                      </td>
                      <td>{study.bodyPart}</td>
                      <td>{study.description}</td>
                      <td>{formatDate(study.studyDate)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(study.status)}`}>
                          {study.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/studies/${study._id}`}
                          className="btn btn-outline btn-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;