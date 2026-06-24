import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Unified navigation for the applicant panel. Every entry maps to a live
// backend feature (auth, profile, jobs, applications, CV analysis, IQ test).
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout } = useAuth();

  const closeOnMobile = () => window.innerWidth < 768 && toggleSidebar();
  const cls = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-box">
          <i className="fas fa-brain"></i>
        </div>
        <span>TalentIQ Hub</span>
        <button className="close-sidebar" onClick={toggleSidebar}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <nav>
        <p className="nav-section-label">Overview</p>
        <ul className="nav-links">
          <li>
            <NavLink to="/" end className={cls} onClick={closeOnMobile}>
              <i className="fas fa-th-large"></i> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={cls} onClick={closeOnMobile}>
              <i className="fas fa-user"></i> Profile
            </NavLink>
          </li>
        </ul>

        <p className="nav-section-label">Jobs</p>
        <ul className="nav-links">
          <li>
            <NavLink to="/jobs" className={cls} onClick={closeOnMobile}>
              <i className="fas fa-briefcase"></i> Browse Jobs
            </NavLink>
          </li>
          <li>
            <NavLink to="/applications" className={cls} onClick={closeOnMobile}>
              <i className="fas fa-paper-plane"></i> My Applications
            </NavLink>
          </li>
        </ul>

        <p className="nav-section-label">Assessments</p>
        <ul className="nav-links">
          <li>
            <NavLink to="/iq-test" className={cls} onClick={closeOnMobile}>
              <i className="fas fa-brain"></i> IQ Test
            </NavLink>
          </li>
          <li>
            <NavLink to="/cv/upload" className={cls} onClick={closeOnMobile}>
              <i className="fas fa-cloud-arrow-up"></i> CV Analysis
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-danger btn-block" onClick={logout}>
          <i className="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
