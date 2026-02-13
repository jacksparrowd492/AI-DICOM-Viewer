import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, FileText, Activity, Calendar, TrendingUp, Clock } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalStudies: 0,
    pendingStudies: 0,
    completedStudies: 0
  });
  const [recentStudies, setRecentStudies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, studiesRes] = await Promise.all([
        axios.get('/patients?limit=1000'),
        axios.get('/studies?limit=1000')
      ]);

      if (patientsRes.data.success) {
        setStats(prev => ({
          ...prev,
          totalPatients: patientsRes.data.total
        }));
      }

      if (studiesRes.data.success) {
        const studies = studiesRes.data.studies;
        setStats(prev => ({
          ...prev,
          totalStudies: studies.length,
          pendingStudies: studies.filter(s => s.status === 'scheduled' || s.status === 'in-progress').length,
          completedStudies: studies.filter(s => s.status === 'completed' || s.status === 'reported').length
        }));
        setRecentStudies(studies.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here's what's happening today.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/patients" className="btn btn-outline">
              <Users size={18} />
              Manage Patients
            </Link>
            <Link to="/studies" className="btn btn-primary">
              <FileText size={18} />
              View Studies
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
              <Users size={24} color="#3b82f6" />
            </div>
            <div className="stat-content">
              <h3>{stats.totalPatients}</h3>
              <p>Total Patients</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#e0e7ff' }}>
              <FileText size={24} color="#6366f1" />
            </div>
            <div className="stat-content">
              <h3>{stats.totalStudies}</h3>
              <p>Total Studies</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
              <Clock size={24} color="#f59e0b" />
            </div>
            <div className="stat-content">
              <h3>{stats.pendingStudies}</h3>
              <p>Pending Studies</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
              <TrendingUp size={24} color="#10b981" />
            </div>
            <div className="stat-content">
              <h3>{stats.completedStudies}</h3>
              <p>Completed Studies</p>
            </div>
          </div>
        </div>

        <div className="recent-section">
          <div className="section-header">
            <h2>Recent Studies</h2>
            <Link to="/studies" className="view-all-link">
              View All
            </Link>
          </div>

          {recentStudies.length === 0 ? (
            <div className="empty-state">
              <Activity size={48} color="#9ca3af" />
              <p>No recent studies found</p>
              <Link to="/studies" className="btn btn-primary">
                Create New Study
              </Link>
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
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudies.map(study => (
                    <tr key={study._id}>
                      <td className="font-medium">{study.studyId}</td>
                      <td>
                        {study.patient ? 
                          `${study.patient.firstName} ${study.patient.lastName}` : 
                          'N/A'
                        }
                      </td>
                      <td>
                        <span className="badge badge-secondary">
                          {study.modality}
                        </span>
                      </td>
                      <td>{study.bodyPart}</td>
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

export default Dashboard;