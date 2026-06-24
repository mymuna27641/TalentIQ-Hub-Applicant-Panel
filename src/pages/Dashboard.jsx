import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { normalizeJob } from '../api/jobs';
import { myApplications } from '../api/applications';
import { iqHistory } from '../api/ai';
import { getApplicantProfile } from '../api/profile';
import { usePoll } from '../hooks/usePoll';

const STATUS_CLASS = {
  applied: 'status-process', submitted: 'status-process', reviewing: 'status-process',
  shortlisted: 'status-hired', interview: 'status-hired', hired: 'status-hired', accepted: 'status-hired',
  rejected: 'status-rejected', withdrawn: 'status-rejected',
};
const prettyStatus = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

function pickScore(res) {
  if (!res || typeof res !== 'object') return null;
  for (const k of ['score', 'iq_score', 'total_score', 'percentage', 'correct']) {
    if (typeof res[k] === 'number') return res[k];
  }
  return null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [iq, setIq] = useState([]);
  const [hasProfile, setHasProfile] = useState(true);
  const [loading, setLoading] = useState(true);

  // `silent` refreshes update the stat cards and recent lists in place without
  // flashing the full-page loader.
  const load = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    const [appsRes, iqRes, profRes] = await Promise.allSettled([
      myApplications(),
      iqHistory(),
      getApplicantProfile(),
    ]);
    if (appsRes.status === 'fulfilled') {
      const d = appsRes.value;
      setApps(Array.isArray(d) ? d : d?.results || []);
    }
    if (iqRes.status === 'fulfilled') {
      const d = iqRes.value;
      setIq(Array.isArray(d) ? d : d?.results || []);
    }
    if (profRes.status === 'fulfilled') {
      setHasProfile(Boolean(profRes.value));
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the snapshot live as new applications / IQ results land.
  usePoll(() => load({ silent: true }), { interval: 20000 });

  const firstName = (user?.full_name || 'there').split(' ')[0];
  const shortlisted = apps.filter((a) =>
    ['shortlisted', 'interview', 'hired', 'accepted'].includes(String(a.status).toLowerCase())
  ).length;
  const bestIq = iq.reduce((max, t) => {
    const s = pickScore(t);
    return s != null && s > max ? s : max;
  }, 0);

  const recentApps = apps.slice(0, 5).map((a, i) => {
    const job = typeof a.job === 'object' && a.job ? normalizeJob(a.job, i) : {
      id: a.job, title: a.job_title || 'Job', company: a.company_name || '—',
      logo: 'JB', logoBg: '#f0f5ff', logoColor: '#8aacef',
    };
    return { id: a.id ?? i, job, status: a.status || 'applied' };
  });

  if (loading) {
    return (
      <div className="page-state">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header-flex" style={{ marginBottom: '1.5rem' }}>
        <div className="page-title-group">
          <h2>Welcome back, {firstName} 👋</h2>
          <p>Here's a snapshot of your job search.</p>
        </div>
      </div>

      {!hasProfile && (
        <div className="ai-banner" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Complete your profile</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>Add your headline and skills so recruiters can find you.</p>
          </div>
          <Link to="/profile" className="btn btn-primary btn-sm"><i className="fas fa-user-pen"></i> Set up profile</Link>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0f5ff', color: '#8aacef' }}><i className="fas fa-paper-plane"></i></div>
          <div>
            <p className="stat-value">{apps.length}</p>
            <p className="stat-label">Applications</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><i className="fas fa-star"></i></div>
          <div>
            <p className="stat-value">{shortlisted}</p>
            <p className="stat-label">Shortlisted</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fdf4ff', color: '#c026d3' }}><i className="fas fa-brain"></i></div>
          <div>
            <p className="stat-value">{iq.length}</p>
            <p className="stat-label">IQ Tests</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><i className="fas fa-trophy"></i></div>
          <div>
            <p className="stat-value">{bestIq || '—'}</p>
            <p className="stat-label">Best IQ Score</p>
          </div>
        </div>
      </div>

      <div className="section-grid" style={{ marginTop: '1.5rem' }}>
        <div className="main-column">
          <div className="content-card">
            <div className="card-header-row">
              <h3><i className="fas fa-paper-plane"></i> Recent Applications</h3>
              <Link to="/applications" className="link">View all</Link>
            </div>
            {recentApps.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <i className="fas fa-briefcase"></i>
                <h3>No applications yet</h3>
                <p>Find a role and apply to get started.</p>
                <Link to="/jobs" className="btn btn-primary btn-sm">Browse Jobs</Link>
              </div>
            ) : (
              <table className="leaderboard-table">
                <tbody>
                  {recentApps.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-md" style={{ background: r.job.logoBg, color: r.job.logoColor }}>{r.job.logo}</div>
                          <div>
                            <p className="user-name">{r.job.id ? <Link to={`/jobs/${r.job.id}`}>{r.job.title}</Link> : r.job.title}</p>
                            <p className="user-role">{r.job.company}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`status-badge ${STATUS_CLASS[String(r.status).toLowerCase()] || 'status-process'}`}>
                          {prettyStatus(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="side-column">
          <div className="content-card">
            <div className="card-header-row">
              <h3><i className="fas fa-brain"></i> Recent IQ Tests</h3>
              <Link to="/iq-test" className="link">Open</Link>
            </div>
            {iq.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <i className="fas fa-clipboard-list"></i>
                <h3>No tests yet</h3>
                <p>Take an IQ test for a job.</p>
                <Link to="/iq-test" className="btn btn-primary btn-sm">Start a test</Link>
              </div>
            ) : (
              iq.slice(0, 5).map((t, i) => (
                <div className="overview-row" key={t.id ?? i}>
                  <span>{t.job_title || t.job?.title || `Test #${t.id ?? i + 1}`}</span>
                  <strong>{pickScore(t) ?? '—'}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
