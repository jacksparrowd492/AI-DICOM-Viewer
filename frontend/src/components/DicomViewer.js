import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import cornerstoneTools from 'cornerstone-tools';

import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import './DicomViewer.css';

/* -------------------- Cornerstone Setup -------------------- */

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.init();

/* ----------------------------------------------------------- */

const DicomViewer = () => {
  const { seriesUID } = useParams();
  const navigate = useNavigate();
  const viewerRef = useRef(null);

  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* -------------------- Fetch Instances -------------------- */

  useEffect(() => {
    if (!seriesUID) {
      setError('Series UID is missing');
      setLoading(false);
      return;
    }

    fetchInstances();
  }, [seriesUID]);

  const fetchInstances = async () => {
    try {
      const response = await axios.get(
        `/pacs/series/${seriesUID}/instances`
      );

      if (response.data.success) {
        setInstances(response.data.instances);
      } else {
        throw new Error('No instances found');
      }
    } catch (err) {
      console.error('Fetch instances error:', err);
      setError('Failed to load DICOM images');
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- Load Images -------------------- */

  useEffect(() => {
    if (viewerRef.current && instances.length > 0) {
      cornerstone.enable(viewerRef.current);
      loadImages();
    }

    return () => {
      if (viewerRef.current) {
        cornerstone.disable(viewerRef.current);
      }
    };
  }, [instances]);

  const loadImages = async () => {
    const element = viewerRef.current;

    const imageIds = instances.map(instance =>
      `wadouri:${window.location.origin}/api/pacs/files/stream/${instance.fileId}`
    );

    const stack = {
      currentImageIdIndex: 0,
      imageIds
    };

    try {
      const image = await cornerstone.loadAndCacheImage(imageIds[0]);

      cornerstone.displayImage(element, image);

      cornerstoneTools.addStackStateManager(element, ['stack']);
      cornerstoneTools.addToolState(element, 'stack', stack);

      cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
      cornerstoneTools.addTool(cornerstoneTools.PanTool);
      cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);

      cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
      cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
    } catch (error) {
      console.error('Image load error:', error);
      setError('Failed to display image');
    }
  };

  /* -------------------- Controls -------------------- */

  const handleZoomIn = () => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.scale += 0.2;
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const handleZoomOut = () => {
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.scale = Math.max(0.1, viewport.scale - 0.2);
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const handleReset = () => {
    cornerstone.reset(viewerRef.current);
  };

  /* -------------------- UI -------------------- */

  if (loading) return <div className="loading">Loading DICOM images...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dicom-viewer">
      <div className="viewer-header">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="tools">
          <button onClick={handleZoomIn}><ZoomIn size={18} /></button>
          <button onClick={handleZoomOut}><ZoomOut size={18} /></button>
          <button onClick={handleReset}><RotateCcw size={18} /></button>
        </div>
      </div>

      <div className="viewer-container">
        <div ref={viewerRef} className="viewer-element"></div>
      </div>
    </div>
  );
};

export default DicomViewer;
