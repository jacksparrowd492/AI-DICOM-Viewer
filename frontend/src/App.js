import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import PatientDetails from './components/PatientDetails';
import StudyList from './components/StudyList';
import StudyDetails from './components/StudyDetails';
import DicomViewer from './components/DicomViewer';
import UploadDicom from './components/UploadDicom';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="spinner"></div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <PrivateRoute>
            <PatientList />
          </PrivateRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <PrivateRoute>
            <PatientDetails />
          </PrivateRoute>
        }
      />
      <Route
        path="/studies"
        element={
          <PrivateRoute>
            <StudyList />
          </PrivateRoute>
        }
      />
      <Route
        path="/studies/:id"
        element={
          <PrivateRoute>
            <StudyDetails />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/:studyId/:fileId"
        element={
          <PrivateRoute>
            <DicomViewer />
          </PrivateRoute>
        }
      />
      <Route
        path="/upload/:studyId"
        element={
          <PrivateRoute>
            <UploadDicom />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;