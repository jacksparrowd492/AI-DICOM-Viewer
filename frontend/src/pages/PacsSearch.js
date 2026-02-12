import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './PacsSearch.css';

const PacsSearch = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    patientName: '',
    patientId: '',
    studyDate: '',
    modality: '',
    accessionNumber: '',
    status: ''
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    try {
      const response = await axios.get('http://localhost:5000/api/pacs/studies/search', {
        params: filters
      });

      setResults(response.data.studies);
      
      if (response.data.studies.length === 0) {
        toast.info('No studies found matching your criteria');
      } else {
        toast.success(`Found ${response.data.studies.length} studies`);
      }
    } catch (error) {
      toast.error('Failed to search studies');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      patientName: '',
      patientId: '',
      studyDate: '',
      modality: '',
      accessionNumber: '',
      status: ''
    });
    setResults([]);
    setSearched(false);
  };

  const handleViewStudy = (studyUID) => {
    navigate(`/study/${studyUID}`);
  };

  return (
    <div className="pacs-search-container">
      <div className="container">
        <div className="search-header">
          <div>
            <h1>🔍 PACS Server - Search & Results</h1>
            <p>Search for studies using the filters below</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            📤 Upload DICOM
          </button>
        </div>

        {/* Search Filters */}
        <div className="card search-card">
          <div className="card-header">
            <h3 className="card-title">Study Search</h3>
          </div>

          <div className="search-form">
            <div className="grid grid-3">
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input
                  type="text"
                  name="patientName"
                  className="form-input"
                  placeholder="Last, First"
                  value={filters.patientName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient ID</label>
                <input
                  type="text"
                  name="patientId"
                  className="form-input"
                  placeholder="Patient ID"
                  value={filters.patientId}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Study Date</label>
                <input
                  type="date"
                  name="studyDate"
                  className="form-input"
                  value={filters.studyDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Modality</label>
                <select
                  name="modality"
                  className="form-select"
                  value={filters.modality}
                  onChange={handleChange}
                >
                  <option value="">All Modalities</option>
                  <option value="CT">CT</option>
                  <option value="MRI">MRI</option>
                  <option value="MR">MR</option>
                  <option value="XR">X-Ray</option>
                  <option value="US">Ultrasound</option>
                  <option value="CR">CR</option>
                  <option value="DX">DX</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Accession Number</label>
                <input
                  type="text"
                  name="accessionNumber"
                  className="form-input"
                  placeholder="Accession Number"
                  value={filters.accessionNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={handleChange}
                >
                  <option value="">All Status</option>
                  <option value="Uploaded">Uploaded</option>
                  <option value="Processing">Processing</option>
                  <option value="AI_Analyzed">AI Analyzed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="search-actions">
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
              <button className="btn btn-outline" onClick={handleClearFilters}>
                🗑️ Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="card results-card">
          <div className="card-header">
            <h3 className="card-title">
              Search Results: {results.length}
            </h3>
          </div>

          {loading ? (
            <div className="loading-section">
              <div className="spinner"></div>
              <p>Searching studies...</p>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="empty-state">
              <p>No studies found matching your criteria</p>
              <button className="btn btn-primary" onClick={() => navigate('/upload')}>
                Upload DICOM Files
              </button>
            </div>
          ) : results.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>PATIENT</th>
                    <th>STUDY DATE</th>
                    <th>MODALITY</th>
                    <th>DESCRIPTION</th>
                    <th>SERIES</th>
                    <th>IMAGES</th>
                    <th>STATUS</th>
                    <th>AI STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((study) => (
                    <tr key={study._id}>
                      <td>
                        <div>
                          <strong>{study.patientName}</strong>
                          <br />
                          <small style={{ color: '#666' }}>{study.patientId}</small>
                        </div>
                      </td>
                      <td>{study.studyDate || 'N/A'}</td>
                      <td>
                        <span className="badge badge-info">{study.modality}</span>
                      </td>
                      <td>{study.studyDescription || 'N/A'}</td>
                      <td>{study.seriesCount || 0}</td>
                      <td>{study.instanceCount || 0}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(study.status)}`}>
                          {study.status}
                        </span>
                      </td>
                      <td>
                        {study.tumorDetected ? (
                          <span className="badge badge-danger">
                            🧠 {study.aiPrediction}
                          </span>
                        ) : study.aiPrediction ? (
                          <span className="badge badge-success">
                            ✅ {study.aiPrediction}
                          </span>
                        ) : (
                          <span className="badge badge-info">Pending</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleViewStudy(study.studyInstanceUID)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Use the search filters above to find studies</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Completed':
    case 'AI_Analyzed':
      return 'badge-success';
    case 'Processing':
      return 'badge-warning';
    case 'Failed':
      return 'badge-danger';
    default:
      return 'badge-info';
  }
};

export default PacsSearch;