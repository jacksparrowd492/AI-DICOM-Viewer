import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Users, FileText, LogOut, Upload } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <FileText size={24} />
          <span>DICOM Viewer</span>
        </Link>

        <div className="navbar-links">
          <Link 
            to="/" 
            className={`navbar-link ${isActive('/') ? 'active' : ''}`}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/patients" 
            className={`navbar-link ${isActive('/patients') ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Patients</span>
          </Link>
          <Link 
            to="/studies" 
            className={`navbar-link ${isActive('/studies') ? 'active' : ''}`}
          >
            <FileText size={18} />
            <span>Studies</span>
          </Link>
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user.firstName} {user.lastName}</span>
            <span className="user-role">{user.role}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;