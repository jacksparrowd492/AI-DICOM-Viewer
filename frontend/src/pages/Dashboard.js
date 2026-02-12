import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/pacs/dashboard/stats');
      setStats(response.data.stats);
    } catch (error) {
      toast.error('Failed to load dashboard statistics');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container">
        <div className="dashboard-header">
          <h1>📊 Dashboard</h1>
          <p>Overview of your Medical PACS System</p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">📁</div>
            <div className="stat-content">
              <h3>{stats?.totalStudies || 0}</h3>
              <p>Total Studies</p>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{stats?.totalPatients || 0}</h3>
              <p>Total Patients</p>
            </div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats?.totalSeries || 0}</h3>
              <p>Total Series</p>
            </div>
          </div>

          <div className="stat-card stat-info">
            <div className="stat-icon">🖼️</div>
            <div className="stat-content">
              <h3>{stats?.totalInstances || 0}</h3>
              <p>Total Images</p>
            </div>
          </div>

          <div className="stat-card stat-danger">
            <div className="stat-icon">🧠</div>
            <div className="stat-content">
              <h3>{stats?.tumorCases || 0}</h3>
              <p>Tumor Cases</p>
            </div>
          </div>

          <div className="stat-card stat-purple">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>{stats?.tumorPercentage || 0}%</h3>
              <p>Tumor Detection Rate</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Tumor Types Distribution */}
          {stats?.tumorTypes && stats.tumorTypes.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Tumor Types Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.tumorTypes}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry._id}: ${entry.count}`}
                  >
                    {stats.tumorTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Modality Distribution */}
          {stats?.modalityDistribution && stats.modalityDistribution.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Modality Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.modalityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Studies */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Studies</h3>
            <button className="btn btn-primary" onClick={() => navigate('/search')}>
              View All
            </button>
          </div>

          {stats?.recentStudies && stats.recentStudies.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Study Date</th>
                    <th>Modality</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentStudies.map((study) => (
                    <tr key={study._id}>
                      <td>{study.patientName}</td>
                      <td>{study.studyDate || 'N/A'}</td>
                      <td>
                        <span className="badge badge-info">{study.modality}</span>
                      </td>
                      <td>{study.studyDescription || 'N/A'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(study.status)}`}>
                          {study.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/study/${study.studyInstanceUID}`)}
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
              <p>No studies available</p>
              <button className="btn btn-primary" onClick={() => navigate('/upload')}>
                Upload DICOM Files
              </button>
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

export default Dashboard;