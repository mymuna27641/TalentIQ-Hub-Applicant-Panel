import { useAuth } from '../context/AuthContext';

const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'U';

const Header = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const name = user?.full_name || 'Applicant';
  const firstName = name.split(' ')[0];

  return (
    <header className="main-header">
      <div className="header-left">
        <button className="menu-btn" onClick={toggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="welcome-msg">
          <h1>Hello, {firstName} 👋</h1>
          <p className="desktop-only">Welcome back to your hub.</p>
        </div>
      </div>

      <div className="header-right">
        <div className="user-profile-nav">
          <div className="user-meta desktop-only">
            <span className="user-name">{name}</span>
            <span className="user-plan">{user?.role || 'Candidate'}</span>
          </div>
          <div className="user-avatar">{initialsOf(name)}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
