import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeJob } from '../api/jobs';
import { myApplications, applicationDetail } from '../api/applications';
import { errorMessage } from '../api/client';
import { usePoll } from '../hooks/usePoll';

// Maps backend application statuses to badge styles.
const STATUS_CLASS = {
  applied: 'status-process',
  submitted: 'status-process',
  reviewing: 'status-process',
  'in review': 'status-process',
  shortlisted: 'status-hired',
  interview: 'status-hired',
  hired: 'status-hired',
  accepted: 'status-hired',
  rejected: 'status-rejected',
  withdrawn: 'status-rejected',
};

const prettyStatus = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_FILTERS = ['all', 'applied', 'shortlisted', 'rejected'];

const Applications = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Application detail modal (GET /applications/{id}/).
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = async (row) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError('');
    if (!row.id) {
      setDetailError('This application has no detail available.');
      return;
    }
    setDetailLoading(true);
    try {
      const data = await applicationDetail(row.id);
      setDetail({ ...data, _job: row.job });
    } catch (err) {
      setDetailError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
    setDetailError('');
  };

  const load = async (status, { silent } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await myApplications(status === 'all' ? undefined : status);
      const list = Array.isArray(data) ? data : data?.results || [];
      setRows(
        list.map((app, i) => {
          const rawJob = typeof app.job === 'object' && app.job ? app.job : null;
          const job = rawJob
            ? normalizeJob(rawJob, i)
            : {
                id: app.job,
                title: app.job_title || 'Job',
                company: app.company_name || '—',
                location: app.location || '',
                logo: 'JB',
                logoBg: '#f0f5ff',
                logoColor: '#8aacef',
              };
          return {
            key: `app-${app.id ?? i}`,
            id: app.id ?? null,
            jobId: job.id,
            job,
            status: app.status || 'applied',
            appliedAt: app.applied_at || app.created_at || null,
          };
        })
      );
    } catch (err) {
      if (!silent) setError(errorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Reflect organizer-side status changes without a manual reload. The hook
  // always calls the latest closure, so it uses the current `filter`.
  usePoll(() => load(filter, { silent: true }), { interval: 20000 });

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="jobs-page">
      <div className="page-header-flex">
        <div className="page-title-group">
          <h2>My Applications</h2>
          <p>Track the status of every role you've applied to.</p>
        </div>
        <div className="filter-controls">
          <select className="modern-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : prettyStatus(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="page-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading your applications…</p>
        </div>
      ) : error ? (
        <div className="page-state error">
          <i className="fas fa-triangle-exclamation"></i>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={() => load(filter)}>
            <i className="fas fa-rotate-right"></i> Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-paper-plane"></i>
          <h3>No applications yet</h3>
          <p>When you apply to a job, it will show up here.</p>
          <Link to="/jobs" className="btn btn-primary btn-sm">
            <i className="fas fa-briefcase"></i> Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="leaderboard-card">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Applied On</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-md" style={{ background: row.job.logoBg, color: row.job.logoColor }}>
                        {row.job.logo}
                      </div>
                      <div>
                        <p className="user-name">
                          {row.jobId ? <Link to={`/jobs/${row.jobId}`}>{row.job.title}</Link> : row.job.title}
                        </p>
                        <p className="user-role">{row.job.company}{row.job.location ? ` · ${row.job.location}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="user-role">{formatDate(row.appliedAt)}</span></td>
                  <td>
                    <span className={`status-badge ${STATUS_CLASS[String(row.status).toLowerCase()] || 'status-process'}`}>
                      {prettyStatus(row.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openDetail(row)}>
                      <i className="fas fa-eye"></i> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailOpen && (
        <div className="modal-overlay active" onClick={closeDetail}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Application Details</h2>
              <button type="button" className="close-modal" onClick={closeDetail}>&times;</button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <div className="page-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading application…</p>
                </div>
              ) : detailError ? (
                <div className="auth-error">
                  <i className="fas fa-circle-exclamation"></i> {detailError}
                </div>
              ) : detail ? (
                <>
                  <div className="overview-row">
                    <span>Role</span>
                    <strong>
                      {detail._job?.id ? (
                        <Link to={`/jobs/${detail._job.id}`} onClick={closeDetail}>{detail._job.title}</Link>
                      ) : (
                        detail._job?.title || '—'
                      )}
                    </strong>
                  </div>
                  <div className="overview-row"><span>Company</span><strong>{detail._job?.company || '—'}</strong></div>
                  <div className="overview-row">
                    <span>Status</span>
                    <strong>
                      <span className={`status-badge ${STATUS_CLASS[String(detail.status).toLowerCase()] || 'status-process'}`}>
                        {prettyStatus(detail.status || 'applied')}
                      </span>
                    </strong>
                  </div>
                  <div className="overview-row"><span>Applied On</span><strong>{formatDate(detail.applied_at || detail.created_at)}</strong></div>
                  {detail.expected_salary != null && (
                    <div className="overview-row"><span>Expected Salary</span><strong>${Number(detail.expected_salary).toLocaleString()}</strong></div>
                  )}
                  {detail.cover_letter && (
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Cover Letter</p>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{detail.cover_letter}</p>
                    </div>
                  )}
                  {detail.recruiter_notes && (
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Recruiter Notes</p>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{detail.recruiter_notes}</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
