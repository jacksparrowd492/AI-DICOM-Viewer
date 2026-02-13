import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import dicomParser from 'dicom-parser';
import { 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Move, 
  Maximize2,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import './DicomViewer.css';

// Initialize cornerstone
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWebImageLoader.external.cornerstone = cornerstone;

// Configure WADO Image Loader
cornerstoneWADOImageLoader.configure({
  beforeSend: function(xhr) {
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
  }
});

const DicomViewer = () => {
  const { studyId, fileId } = useParams();
  const navigate = useNavigate();
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewport, setViewport] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [activeTool, setActiveTool] = useState('pan');

  useEffect(() => {
    if (viewerRef.current) {
      initializeViewer();
    }

    return () => {
      if (viewerRef.current) {
        cornerstone.disable(viewerRef.current);
      }
    };
  }, [fileId]);

  const initializeViewer = async () => {
    try {
      setLoading(true);
      setError(null);

      // Enable the element
      cornerstone.enable(viewerRef.current);

      // Construct image URL
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const imageUrl = `${API_URL}/files/download/${fileId}`;

      // Fetch file info to determine type
      const infoResponse = await axios.get(`/files/info/${fileId}`);
      const fileInfo = infoResponse.data.file;

      let imageId;
      
      // Check if it's a DICOM file
      if (fileInfo.contentType === 'application/dicom' || 
          fileInfo.filename.toLowerCase().endsWith('.dcm')) {
        // Use WADO Image Loader for DICOM
        imageId = `wadouri:${imageUrl}`;
      } else {
        // Use Web Image Loader for regular images
        imageId = imageUrl;
      }

      // Load and display the image
      const image = await cornerstone.loadImage(imageId);
      cornerstone.displayImage(viewerRef.current, image);

      // Get viewport
      const currentViewport = cornerstone.getViewport(viewerRef.current);
      setViewport(currentViewport);

      // Extract image info
      if (image.data) {
        setImageInfo({
          rows: image.rows,
          columns: image.columns,
          pixelSpacing: image.rowPixelSpacing,
          sliceThickness: image.data?.string('x00180050'),
          windowCenter: image.windowCenter,
          windowWidth: image.windowWidth,
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading image:', err);
      setError('Failed to load image. It may not be a valid DICOM file.');
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    if (!viewerRef.current) return;
    const currentViewport = cornerstone.getViewport(viewerRef.current);
    currentViewport.scale += 0.2;
    cornerstone.setViewport(viewerRef.current, currentViewport);
    setViewport(currentViewport);
  };

  const handleZoomOut = () => {
    if (!viewerRef.current) return;
    const currentViewport = cornerstone.getViewport(viewerRef.current);
    currentViewport.scale -= 0.2;
    if (currentViewport.scale < 0.1) currentViewport.scale = 0.1;
    cornerstone.setViewport(viewerRef.current, currentViewport);
    setViewport(currentViewport);
  };

  const handleRotate = () => {
    if (!viewerRef.current) return;
    const currentViewport = cornerstone.getViewport(viewerRef.current);
    currentViewport.rotation += 90;
    cornerstone.setViewport(viewerRef.current, currentViewport);
    setViewport(currentViewport);
  };

  const handleReset = () => {
    if (!viewerRef.current) return;
    cornerstone.reset(viewerRef.current);
    const currentViewport = cornerstone.getViewport(viewerRef.current);
    setViewport(currentViewport);
  };

  const handleInvert = () => {
    if (!viewerRef.current) return;
    const currentViewport = cornerstone.getViewport(viewerRef.current);
    currentViewport.invert = !currentViewport.invert;
    cornerstone.setViewport(viewerRef.current, currentViewport);
    setViewport(currentViewport);
  };

  const handleWindowLevel = (center, width) => {
    if (!viewerRef.current) return;
    const currentViewport = cornerstone.getViewport(viewerRef.current);
    currentViewport.voi.windowCenter = center;
    currentViewport.voi.windowWidth = width;
    cornerstone.setViewport(viewerRef.current, currentViewport);
    setViewport(currentViewport);
  };

  // Mouse event handlers for panning
  useEffect(() => {
    if (!viewerRef.current || activeTool !== 'pan') return;

    let isDragging = false;
    let startX, startY;

    const handleMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const currentViewport = cornerstone.getViewport(viewerRef.current);
      currentViewport.translation.x += deltaX;
      currentViewport.translation.y += deltaY;
      cornerstone.setViewport(viewerRef.current, currentViewport);
      
      startX = e.clientX;
      startY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const element = viewerRef.current;
    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTool]);

  return (
    <div className="dicom-viewer">
      <div className="viewer-header">
        <button className="btn btn-outline" onClick={() => navigate(`/studies/${studyId}`)}>
          <ArrowLeft size={18} />
          Back to Study
        </button>
        <h2>DICOM Viewer</h2>
      </div>

      <div className="viewer-container">
        <div className="viewer-toolbar">
          <div className="toolbar-group">
            <button 
              className={`toolbar-btn ${activeTool === 'pan' ? 'active' : ''}`}
              onClick={() => setActiveTool('pan')}
              title="Pan"
            >
              <Move size={20} />
            </button>
            <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={20} />
            </button>
            <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={20} />
            </button>
            <button className="toolbar-btn" onClick={handleRotate} title="Rotate">
              <RotateCw size={20} />
            </button>
            <button className="toolbar-btn" onClick={handleReset} title="Reset">
              <RefreshCw size={20} />
            </button>
            <button className="toolbar-btn" onClick={handleInvert} title="Invert">
              {viewport?.invert ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">Presets:</span>
            <button 
              className="toolbar-btn-text"
              onClick={() => handleWindowLevel(40, 400)}
            >
              Soft Tissue
            </button>
            <button 
              className="toolbar-btn-text"
              onClick={() => handleWindowLevel(400, 1800)}
            >
              Bone
            </button>
            <button 
              className="toolbar-btn-text"
              onClick={() => handleWindowLevel(-600, 1600)}
            >
              Lung
            </button>
          </div>
        </div>

        <div className="viewer-main">
          <div className="viewer-canvas-container">
            {loading && (
              <div className="viewer-loading">
                <div className="spinner"></div>
                <p>Loading image...</p>
              </div>
            )}
            {error && (
              <div className="viewer-error">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={initializeViewer}>
                  Retry
                </button>
              </div>
            )}
            <div 
              ref={viewerRef} 
              className="viewer-canvas"
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          <div className="viewer-info">
            {viewport && (
              <>
                <div className="info-item">
                  <span className="info-label">Zoom:</span>
                  <span className="info-value">{(viewport.scale * 100).toFixed(0)}%</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Rotation:</span>
                  <span className="info-value">{viewport.rotation}°</span>
                </div>
                {viewport.voi && (
                  <>
                    <div className="info-item">
                      <span className="info-label">WW:</span>
                      <span className="info-value">{viewport.voi.windowWidth?.toFixed(0)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">WC:</span>
                      <span className="info-value">{viewport.voi.windowCenter?.toFixed(0)}</span>
                    </div>
                  </>
                )}
              </>
            )}
            {imageInfo && (
              <>
                <div className="info-item">
                  <span className="info-label">Dimensions:</span>
                  <span className="info-value">{imageInfo.columns} × {imageInfo.rows}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DicomViewer;