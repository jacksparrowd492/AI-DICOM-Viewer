import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Activity, 
  FileText, 
  Upload, 
  Eye,
  Download,
  Trash2,
  Edit,
  Save
} from 'lucide-react';
import './StudyDetails.css';

const StudyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    findings: '',
    impression: '',
    recommendations: ''
  });

  useEffect(() => {
    fetchStudyDetails();
  }, [id]);

  const fetchStudyDetails = async () => {
    try {
      const response = await axios.get(`/studies/${id}`);
      if (response.data.success) {
        setStudy(response.data.study);
        if (response.data.study.findings) {
          setReportData({
            findings: response.data.study.findings || '',
            impression: response.data.study.impression || '',
            recommendations: response.data.study.recommendations || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching study:', error);
      alert('Error loading study details');
      navigate('/studies');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const response = await axios.delete(`/files/${id}/${fileId}`);
      if (response.data.success) {
        alert('Image deleted successfully');
        fetchStudyDetails();
      }
    } catch (error) {
      alert('Error deleting image');
      console.error(error);
    }
  };

  const handleDownloadImage = async (fileId, filename) => {
    try {
      const response = await axios.get(`/files/download/${fileId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error downloading file');
      console.error(error);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/studies/${id}/report`, reportData);
      if (response.data.success) {
        alert('Report saved successfully');
        setShowReportModal(false);
        fetchStudyDetails();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving report');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (!study) {
    return <div>Study not found</div>;
  }

  return (
    <div className="study-details">
      <div className="study-details-container">
        <div className="details-header">
          <button className="btn btn-outline" onClick={() => navigate('/studies')}>
            <ArrowLeft size={18} />
            Back to Studies
          </button>
          <div className="header-actions">
            <Link to={`/upload/${id}`} className="btn btn-primary">
              <Upload size={18} />
              Upload Images
            </Link>
            <button className="btn btn-success" onClick={() => setShowReportModal(true)}>
              <FileText size={18} />
              {study.findings ? 'Edit Report' : 'Add Report'}
            </button>
          </div>
        </div>

        {/* Study Overview */}
        <div className="study-overview card">
          <div className="overview-header">
            <div>
              <h1>Study: {study.studyId}</h1>
              <div className="overview-badges">
                <span className={`badge ${getStatusBadge(study.status)}`}>
                  {study.status}
                </span>
                <span className={`badge ${getPriorityBadge(study.priority)}`}>
                  {study.priority}
                </span>
                <span className="badge badge-secondary">{study.modality}</span>
              </div>
            </div>
          </div>

          <div className="overview-grid">
            <div className="overview-item">
              <div className="overview-icon">
                <User size={20} color="#3b82f6" />
              </div>
              <div>
                <div className="overview-label">Patient</div>
                <div className="overview-value">
                  {study.patient ? (
                    <Link to={`/patients/${study.patient._id}`} className="patient-link">
                      {study.patient.firstName} {study.patient.lastName}
                    </Link>
                  ) : (
                    'N/A'
                  )}
                </div>
              </div>
            </div>

            <div className="overview-item">
              <div className="overview-icon">
                <Calendar size={20} color="#10b981" />
              </div>
              <div>
                <div className="overview-label">Study Date</div>
                <div className="overview-value">{formatDate(study.studyDate)}</div>
              </div>
            </div>

            <div className="overview-item">
              <div className="overview-icon">
                <Activity size={20} color="#f59e0b" />
              </div>
              <div>
                <div className="overview-label">Body Part</div>
                <div className="overview-value">{study.bodyPart}</div>
              </div>
            </div>

            <div className="overview-item">
              <div className="overview-icon">
                <FileText size={20} color="#6366f1" />
              </div>
              <div>
                <div className="overview-label">Images</div>
                <div className="overview-value">{study.images?.length || 0} files</div>
              </div>
            </div>
          </div>

          <div className="study-info">
            <div className="info-section">
              <h3>Description</h3>
              <p>{study.description}</p>
            </div>

            {study.clinicalHistory && (
              <div className="info-section">
                <h3>Clinical History</h3>
                <p>{study.clinicalHistory}</p>
              </div>
            )}

            {(study.referringPhysician || study.performingPhysician) && (
              <div className="physicians-grid">
                {study.referringPhysician && (
                  <div className="info-section">
                    <h3>Referring Physician</h3>
                    <p>{study.referringPhysician}</p>
                  </div>
                )}
                {study.performingPhysician && (
                  <div className="info-section">
                    <h3>Performing Physician</h3>
                    <p>{study.performingPhysician}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Report Section */}
        {study.findings && (
          <div className="report-section card">
            <div className="section-header">
              <h2>
                <FileText size={24} />
                Radiology Report
              </h2>
              <button className="btn btn-outline" onClick={() => setShowReportModal(true)}>
                <Edit size={16} />
                Edit Report
              </button>
            </div>

            <div className="report-content">
              <div className="report-item">
                <h3>Findings</h3>
                <p>{study.findings}</p>
              </div>

              <div className="report-item">
                <h3>Impression</h3>
                <p>{study.impression}</p>
              </div>

              {study.recommendations && (
                <div className="report-item">
                  <h3>Recommendations</h3>
                  <p>{study.recommendations}</p>
                </div>
              )}

              {study.reportedBy && (
                <div className="report-footer">
                  <div>
                    <strong>Reported by:</strong> {study.reportedBy.firstName} {study.reportedBy.lastName}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(study.reportedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Images Section */}
        <div className="images-section">
          <div className="section-header">
            <h2>
              <FileText size={24} />
              DICOM Images ({study.images?.length || 0})
            </h2>
          </div>

          {!study.images || study.images.length === 0 ? (
            <div className="empty-state">
              <Upload size={48} color="#9ca3af" />
              <p>No images uploaded yet</p>
              <Link to={`/upload/${id}`} className="btn btn-primary">
                <Upload size={18} />
                Upload Images
              </Link>
            </div>
          ) : (
            <div className="images-grid">
              {study.images.map((image, index) => (
                <div key={image.fileId} className="image-card">
                  <div className="image-header">
                    <span className="image-number">Image {index + 1}</span>
                    <div className="image-actions">
                      <button
                        className="btn-icon"
                        onClick={() => navigate(`/viewer/${id}/${image.fileId}`)}
                        title="View in Viewer"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDownloadImage(image.fileId, image.filename)}
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDeleteImage(image.fileId)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="image-info">
                    <div className="info-row">
                      <span className="info-label">Filename:</span>
                      <span className="info-text">{image.filename}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Size:</span>
                      <span className="info-text">
                        {(image.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Uploaded:</span>
                      <span className="info-text">
                        {new Date(image.uploadDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-block btn-sm"
                    onClick={() => navigate(`/viewer/${id}/${image.fileId}`)}
                  >
                    <Eye size={14} />
                    Open in Viewer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <h2>{study.findings ? 'Edit Report' : 'Add Report'}</h2>

              <form onSubmit={handleSubmitReport}>
                <div className="form-group">
                  <label className="label">Findings *</label>
                  <textarea
                    className="input"
                    rows="6"
                    value={reportData.findings}
                    onChange={(e) => setReportData({ ...reportData, findings: e.target.value })}
                    required
                    placeholder="Describe the findings from the imaging study..."
                  />
                </div>

                <div className="form-group">
                  <label className="label">Impression *</label>
                  <textarea
                    className="input"
                    rows="4"
                    value={reportData.impression}
                    onChange={(e) => setReportData({ ...reportData, impression: e.target.value })}
                    required
                    placeholder="Summary and interpretation of findings..."
                  />
                </div>

                <div className="form-group">
                  <label className="label">Recommendations</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={reportData.recommendations}
                    onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
                    placeholder="Clinical recommendations based on findings..."
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowReportModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    <Save size={18} />
                    Save Report
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

export default StudyDetails;