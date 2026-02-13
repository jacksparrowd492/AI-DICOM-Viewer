import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, ArrowLeft, X, CheckCircle, AlertCircle } from 'lucide-react';
import './UploadDicom.css';

const UploadDicom = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [study, setStudy] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});

  useEffect(() => {
    fetchStudy();
  }, [studyId]);

  const fetchStudy = async () => {
    try {
      const response = await axios.get(`/studies/${studyId}`);
      if (response.data.success) {
        setStudy(response.data.study);
      }
    } catch (error) {
      console.error('Error fetching study:', error);
      alert('Error loading study');
      navigate('/studies');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size
    }));
    setFiles([...files, ...newFiles]);
  };

  const handleRemoveFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
    const newProgress = { ...uploadProgress };
    const newStatus = { ...uploadStatus };
    delete newProgress[fileId];
    delete newStatus[fileId];
    setUploadProgress(newProgress);
    setUploadStatus(newStatus);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });

      const response = await axios.post(`/files/upload/${studyId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // Update overall progress
          const newProgress = {};
          files.forEach(f => {
            newProgress[f.id] = percentCompleted;
          });
          setUploadProgress(newProgress);
        }
      });

      if (response.data.success) {
        // Mark all as success
        const newStatus = {};
        files.forEach(f => {
          newStatus[f.id] = 'success';
        });
        setUploadStatus(newStatus);

        setTimeout(() => {
          alert('Files uploaded successfully!');
          navigate(`/studies/${studyId}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Mark all as error
      const newStatus = {};
      files.forEach(f => {
        newStatus[f.id] = 'error';
      });
      setUploadStatus(newStatus);
      
      alert(error.response?.data?.message || 'Error uploading files');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileStatusIcon = (fileId) => {
    const status = uploadStatus[fileId];
    if (status === 'success') {
      return <CheckCircle size={20} color="#10b981" />;
    } else if (status === 'error') {
      return <AlertCircle size={20} color="#ef4444" />;
    }
    return null;
  };

  return (
    <div className="upload-dicom">
      <div className="upload-container">
        <div className="upload-header">
          <button className="btn btn-outline" onClick={() => navigate(`/studies/${studyId}`)}>
            <ArrowLeft size={18} />
            Back to Study
          </button>
        </div>

        {study && (
          <div className="study-info-card card">
            <h2>Upload DICOM Images</h2>
            <div className="study-meta">
              <div>
                <span className="meta-label">Study ID:</span>
                <span className="meta-value">{study.studyId}</span>
              </div>
              <div>
                <span className="meta-label">Patient:</span>
                <span className="meta-value">
                  {study.patient ? `${study.patient.firstName} ${study.patient.lastName}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="meta-label">Modality:</span>
                <span className="badge badge-secondary">{study.modality}</span>
              </div>
              <div>
                <span className="meta-label">Body Part:</span>
                <span className="meta-value">{study.bodyPart}</span>
              </div>
            </div>
          </div>
        )}

        <div className="upload-area card">
          <div className="upload-zone">
            <input
              type="file"
              id="file-input"
              className="file-input"
              accept=".dcm,image/*,application/dicom"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <label htmlFor="file-input" className="upload-label">
              <Upload size={48} color="#3b82f6" />
              <h3>Choose DICOM Files</h3>
              <p>Click to browse or drag and drop DICOM files here</p>
              <span className="upload-hint">Supports .dcm files and medical images</span>
            </label>
          </div>
        </div>

        {files.length > 0 && (
          <div className="files-list card">
            <div className="files-header">
              <h3>Selected Files ({files.length})</h3>
              {!uploading && (
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setFiles([])}
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="files-content">
              {files.map(fileObj => (
                <div key={fileObj.id} className="file-item">
                  <div className="file-info">
                    <div className="file-name">{fileObj.name}</div>
                    <div className="file-size">{formatFileSize(fileObj.size)}</div>
                  </div>

                  <div className="file-actions">
                    {uploadProgress[fileObj.id] !== undefined && (
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${uploadProgress[fileObj.id]}%` }}
                        />
                        <span className="progress-text">
                          {uploadProgress[fileObj.id]}%
                        </span>
                      </div>
                    )}
                    
                    {getFileStatusIcon(fileObj.id)}
                    
                    {!uploading && !uploadStatus[fileObj.id] && (
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleRemoveFile(fileObj.id)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="files-footer">
              <div className="total-size">
                Total: {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
              >
                <Upload size={18} />
                {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDicom;