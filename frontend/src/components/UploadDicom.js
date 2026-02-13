import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, ArrowLeft, X, CheckCircle, AlertCircle, User, Calendar, Activity } from 'lucide-react';
import dicomParser from 'dicom-parser';
import './UploadDicom.css';

const UploadDicom = () => {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [study, setStudy] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  
  // Auto-extracted patient data from DICOM
  const [extractedPatientData, setExtractedPatientData] = useState(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  
  // Patient form data
  const [patientFormData, setPatientFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
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

  // Study metadata from DICOM
  const [extractedStudyData, setExtractedStudyData] = useState({
    studyDate: '',
    modality: '',
    bodyPart: '',
    description: '',
    referringPhysician: '',
    performingPhysician: '',
    clinicalHistory: '',
    studyId: '',
    studyInstanceUID: ''
  });

  useEffect(() => {
    if (!studyId) {
      // If no studyId, we're creating a new study
      setShowPatientForm(true);
    } else {
      fetchStudy();
    }
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

  const extractDicomMetadata = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target.result;
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);
          
          // Helper function to safely get DICOM tags
          const getString = (tag) => {
            try {
              return dataSet.string(tag) || '';
            } catch (e) {
              return '';
            }
          };
          
          const getDate = (tag) => {
            try {
              const dateStr = dataSet.string(tag);
              if (dateStr && dateStr.length === 8) {
                // DICOM date format: YYYYMMDD
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                return `${year}-${month}-${day}`;
              }
              return '';
            } catch (e) {
              return '';
            }
          };
          
          // Extract patient information
          const patientName = getString('x00100010');
          const nameParts = patientName.split('^');
          
          const patientData = {
            patientId: getString('x00100020'),
            lastName: nameParts[0] || '',
            firstName: nameParts[1] || '',
            middleName: nameParts[2] || '',
            dateOfBirth: getDate('x00100030'),
            gender: getString('x00100040') === 'M' ? 'Male' : 
                    getString('x00100040') === 'F' ? 'Female' : 'Other',
            patientAge: getString('x00101010'),
            patientWeight: getString('x00101030'),
            patientSize: getString('x00101020')
          };
          
          // Extract study information
          const studyData = {
            studyInstanceUID: getString('x0020000d'),
            studyId: getString('x00200010'),
            studyDate: getDate('x00080020'),
            studyTime: getString('x00080030'),
            studyDescription: getString('x00081030'),
            modality: getString('x00080060'),
            bodyPartExamined: getString('x00180015'),
            referringPhysicianName: getString('x00080090'),
            performingPhysicianName: getString('x00081050'),
            institutionName: getString('x00080080'),
            manufacturer: getString('x00080070'),
            manufacturerModelName: getString('x00081090'),
            stationName: getString('x00081010')
          };
          
          // Extract series information
          const seriesData = {
            seriesInstanceUID: getString('x0020000e'),
            seriesNumber: getString('x00200011'),
            seriesDescription: getString('x0008103e'),
            instanceNumber: getString('x00200013'),
            sliceLocation: getString('x00201041'),
            imagePosition: getString('x00200032'),
            imageOrientation: getString('x00200037'),
            pixelSpacing: getString('x00280030'),
            sliceThickness: getString('x00180050'),
            rows: getString('x00280010'),
            columns: getString('x00280011'),
            windowCenter: getString('x00281050'),
            windowWidth: getString('x00281051')
          };
          
          resolve({
            patient: patientData,
            study: studyData,
            series: seriesData,
            fileName: file.name
          });
        } catch (error) {
          console.error('Error parsing DICOM:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;
    
    try {
      // Extract metadata from all files
      const metadatas = await Promise.all(selectedFiles.map(file => extractDicomMetadata(file)));
      
      // Check if all files have the same patientId and studyInstanceUID
      const patientIds = new Set(metadatas.map(m => m.patient.patientId));
      const studyUids = new Set(metadatas.map(m => m.study.studyInstanceUID));
      
      if (patientIds.size > 1 || studyUids.size > 1) {
        alert('All selected files must belong to the same patient and study.');
        return;
      }
      
      // Use the first metadata for form population
      const metadata = metadatas[0];
      
      console.log('Extracted DICOM metadata:', metadata);
      
      // Set extracted patient data
      setExtractedPatientData(metadata.patient);
      
      // Pre-fill patient form with extracted data (excluding patientId as it's auto-used)
      setPatientFormData(prev => ({
        ...prev,
        firstName: metadata.patient.firstName || prev.firstName,
        lastName: metadata.patient.lastName || prev.lastName,
        dateOfBirth: metadata.patient.dateOfBirth || prev.dateOfBirth,
        gender: metadata.patient.gender || prev.gender
      }));
      
      // Set study metadata
      setExtractedStudyData({
        studyDate: metadata.study.studyDate || new Date().toISOString().split('T')[0],
        modality: metadata.study.modality || '',
        bodyPart: metadata.study.bodyPartExamined || '',
        description: metadata.study.studyDescription || '',
        referringPhysician: metadata.study.referringPhysicianName || '',
        performingPhysician: metadata.study.performingPhysicianName || '',
        clinicalHistory: '',
        studyId: metadata.study.studyId || '',
        studyInstanceUID: metadata.study.studyInstanceUID || ''
      });
      
      // If no study exists, show patient form
      if (!studyId) {
        setShowPatientForm(true);
      }
      
      // Add files to list
      const newFiles = selectedFiles.map((file, index) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        metadata: metadatas[index]
      }));
      setFiles([...files, ...newFiles]);
      
    } catch (error) {
      console.error('Error extracting DICOM metadata:', error);
      alert('Warning: Could not extract patient information from DICOM file. Please fill in manually.');
    }
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

  const handlePatientFormChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested fields like address.city
      const [parent, child] = field.split('.');
      setPatientFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setPatientFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleStudyFormChange = (field, value) => {
    setExtractedStudyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePatientForm = () => {
    const required = ['firstName', 'lastName', 'dateOfBirth', 'gender'];
    const missing = required.filter(field => !patientFormData[field]);
    
    if (missing.length > 0) {
      alert(`Please fill in required fields: ${missing.join(', ')}`);
      return false;
    }
    
    return true;
  };

  const validateStudyForm = () => {
    const required = ['studyDate', 'modality', 'bodyPart', 'description'];
    const missing = required.filter(field => !extractedStudyData[field]);
    
    if (missing.length > 0) {
      alert(`Please fill in required study fields: ${missing.join(', ')}`);
      return false;
    }
    
    return true;
  };

  const createPatientAndStudy = async () => {
    if (!validatePatientForm() || !validateStudyForm()) {
      return null;
    }
    
    if (!extractedPatientData?.patientId) {
      alert('No Patient ID extracted from DICOM files.');
      return null;
    }
    
    if (!extractedStudyData?.studyInstanceUID) {
      alert('No Study Instance UID extracted from DICOM files.');
      return null;
    }
    
    try {
      // First, check if patient already exists using extracted patientId
      let patientMongoId;
      const checkPatientResponse = await axios.get(`/patients/check/${extractedPatientData.patientId}`);
      
      if (checkPatientResponse.data.exists) {
        patientMongoId = checkPatientResponse.data.patient._id;
        console.log('Patient already exists:', patientMongoId);
      } else {
        // Create new patient using extracted patientId and form data
        const patientPayload = {
          patientId: extractedPatientData.patientId,  // From DICOM
          ...patientFormData
        };
        const patientResponse = await axios.post('/patients', patientPayload);
        if (patientResponse.data.success) {
          patientMongoId = patientResponse.data.patient._id;
          console.log('Created new patient:', patientMongoId);
        } else {
          throw new Error('Failed to create patient');
        }
      }
      
      // Create study using extracted studyInstanceUID and studyId
      const studyPayload = {
        ...extractedStudyData,
        studyInstanceUID: extractedStudyData.studyInstanceUID,  // From DICOM
        studyId: extractedStudyData.studyId,  // From DICOM if available
        patient: patientMongoId,
        status: 'in-progress',
        priority: 'routine'
      };
      
      const studyResponse = await axios.post('/studies', studyPayload);
      
      if (studyResponse.data.success) {
        console.log('Created new study:', studyResponse.data.study._id);
        return studyResponse.data.study._id;
      } else {
        throw new Error('Failed to create study');
      }
      
    } catch (error) {
      console.error('Error creating patient/study:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);

    try {
      let targetStudyId = studyId;
      
      // If no studyId, create patient and study first
      if (!targetStudyId) {
        targetStudyId = await createPatientAndStudy();
        if (!targetStudyId) {
          throw new Error('Failed to create study');
        }
      }

      const formData = new FormData();
      files.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });

      const response = await axios.post(`/files/upload/${targetStudyId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          const newProgress = {};
          files.forEach(f => {
            newProgress[f.id] = percentCompleted;
          });
          setUploadProgress(newProgress);
        }
      });

      if (response.data.success) {
        const newStatus = {};
        files.forEach(f => {
          newStatus[f.id] = 'success';
        });
        setUploadStatus(newStatus);

        setTimeout(() => {
          alert('Files uploaded successfully!');
          navigate(`/studies/${targetStudyId}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      const newStatus = {};
      files.forEach(f => {
        newStatus[f.id] = 'error';
      });
      setUploadStatus(newStatus);
      
      alert(error.response?.data?.message || error.message || 'Error uploading files');
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
          <button 
            className="btn btn-outline" 
            onClick={() => navigate(studyId ? `/studies/${studyId}` : '/studies')}
          >
            <ArrowLeft size={18} />
            {studyId ? 'Back to Study' : 'Back to Studies'}
          </button>
        </div>

        <h1 className="page-title">
          {studyId ? 'Upload DICOM Images' : 'Create New Study & Upload DICOM Images'}
        </h1>

        {/* Show study info if editing existing study */}
        {study && (
          <div className="study-info-card card">
            <h2>Uploading to Study</h2>
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

        {/* Patient and Study Form (shown when creating new study) */}
        {showPatientForm && !studyId && (
          <div className="patient-study-form card">
            <h2>Patient & Study Information</h2>
            <p className="form-description">
              {extractedPatientData 
                ? '✓ Patient information extracted from DICOM. Please verify and fill in missing details.'
                : 'Please fill in patient and study information below.'}
            </p>

            {/* Patient Information */}
            <div className="form-section">
              <h3>
                <User size={20} />
                Patient Information
              </h3>
              
              <div className="form-grid">
                {/* Removed patientId input - using extracted */}

                <div className="form-group">
                  <label className="label required">First Name</label>
                  <input
                    type="text"
                    className="input"
                    value={patientFormData.firstName}
                    onChange={(e) => handlePatientFormChange('firstName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label required">Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={patientFormData.lastName}
                    onChange={(e) => handlePatientFormChange('lastName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label required">Date of Birth</label>
                  <input
                    type="date"
                    className="input"
                    value={patientFormData.dateOfBirth}
                    onChange={(e) => handlePatientFormChange('dateOfBirth', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label required">Gender</label>
                  <select
                    className="input"
                    value={patientFormData.gender}
                    onChange={(e) => handlePatientFormChange('gender', e.target.value)}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={patientFormData.email}
                    onChange={(e) => handlePatientFormChange('email', e.target.value)}
                    placeholder="patient@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={patientFormData.phone}
                    onChange={(e) => handlePatientFormChange('phone', e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Blood Group</label>
                  <select
                    className="input"
                    value={patientFormData.bloodGroup}
                    onChange={(e) => handlePatientFormChange('bloodGroup', e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
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

              {/* Address */}
              <div className="form-subsection">
                <h4>Address (Optional)</h4>
                <div className="form-grid">
                  <div className="form-group form-group-full">
                    <label className="label">Street</label>
                    <input
                      type="text"
                      className="input"
                      value={patientFormData.address.street}
                      onChange={(e) => handlePatientFormChange('address.street', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">City</label>
                    <input
                      type="text"
                      className="input"
                      value={patientFormData.address.city}
                      onChange={(e) => handlePatientFormChange('address.city', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">State</label>
                    <input
                      type="text"
                      className="input"
                      value={patientFormData.address.state}
                      onChange={(e) => handlePatientFormChange('address.state', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Zip Code</label>
                    <input
                      type="text"
                      className="input"
                      value={patientFormData.address.zipCode}
                      onChange={(e) => handlePatientFormChange('address.zipCode', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Country</label>
                    <input
                      type="text"
                      className="input"
                      value={patientFormData.address.country}
                      onChange={(e) => handlePatientFormChange('address.country', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Study Information */}
            <div className="form-section">
              <h3>
                <Activity size={20} />
                Study Information
              </h3>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="label required">Study Date</label>
                  <input
                    type="date"
                    className="input"
                    value={extractedStudyData.studyDate}
                    onChange={(e) => handleStudyFormChange('studyDate', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label required">Modality</label>
                  <select
                    className="input"
                    value={extractedStudyData.modality}
                    onChange={(e) => handleStudyFormChange('modality', e.target.value)}
                    required
                  >
                    <option value="">Select Modality</option>
                    <option value="CT">CT</option>
                    <option value="MRI">MRI</option>
                    <option value="X-RAY">X-RAY</option>
                    <option value="ULTRASOUND">Ultrasound</option>
                    <option value="PET">PET</option>
                    <option value="MAMMOGRAPHY">Mammography</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label required">Body Part</label>
                  <input
                    type="text"
                    className="input"
                    value={extractedStudyData.bodyPart}
                    onChange={(e) => handleStudyFormChange('bodyPart', e.target.value)}
                    required
                    placeholder="e.g., Brain, Chest, Abdomen"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="label required">Description</label>
                  <input
                    type="text"
                    className="input"
                    value={extractedStudyData.description}
                    onChange={(e) => handleStudyFormChange('description', e.target.value)}
                    required
                    placeholder="e.g., Brain MRI with contrast"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Referring Physician</label>
                  <input
                    type="text"
                    className="input"
                    value={extractedStudyData.referringPhysician}
                    onChange={(e) => handleStudyFormChange('referringPhysician', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Performing Physician</label>
                  <input
                    type="text"
                    className="input"
                    value={extractedStudyData.performingPhysician}
                    onChange={(e) => handleStudyFormChange('performingPhysician', e.target.value)}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="label">Clinical History</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={extractedStudyData.clinicalHistory}
                    onChange={(e) => handleStudyFormChange('clinicalHistory', e.target.value)}
                    placeholder="Enter clinical history and reason for examination..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Area */}
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
              <span className="upload-hint">
                Supports .dcm files - Patient info will be auto-extracted
              </span>
            </label>
          </div>
        </div>

        {/* Selected Files List */}
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