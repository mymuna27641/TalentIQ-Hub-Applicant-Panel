import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ApplyModal from '../components/ApplyModal';
import { getJob, normalizeJob } from '../api/jobs';
import { errorMessage } from '../api/client';
import { useData } from '../context/DataContext';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ensureApplications, hasAppliedTo, markApplied } = useData();
  const [applyingJob, setApplyingJob] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getJob(id);
        if (active) setJob(normalizeJob(data));
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    ensureApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="page-state">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading job…</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="empty-state">
        <i className="fas fa-circle-question"></i>
        <h3>Job not available</h3>
        <p>{error || 'This listing may have been removed.'}</p>
        <Link to="/jobs" className="btn btn-primary btn-sm">Back to Browse</Link>
      </div>
    );
  }

  const fmtDeadline = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return Number.isNaN(date.getTime())
      ? d
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="jobs-page">
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }} onClick={() => navigate(-1)}>
        <i className="fas fa-arrow-left"></i> Back
      </button>

      <div className="profile-hero-card">
        <div className="profile-identity">
          <div className="profile-avatar-large" style={{ background: job.logoBg, color: job.logoColor }}>
            {job.logo}
          </div>
          <div className="profile-info-group">
            <div className="profile-name-row">
              <h2>{job.title}</h2>
            </div>
            <p className="profile-title">{job.company}</p>
            <div className="profile-meta-tags">
              <span><i className="fas fa-location-dot"></i> {job.location}</span>
              <span><i className="fas fa-laptop-house"></i> {job.mode}</span>
              <span><i className="fas fa-sack-dollar"></i> {job.salary}</span>
              <span><i className="fas fa-clock"></i> {job.postedAgo}</span>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          {hasAppliedTo(job.id) ? (
            <button className="btn btn-secondary" disabled>
              <i className="fas fa-circle-check"></i> Applied
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setApplyingJob(job)}>
              <i className="fas fa-paper-plane"></i> Apply Now
            </button>
          )}
        </div>
      </div>

      <div className="section-grid">
        <div className="main-column">
          <div className="content-card">
            <h3><i className="fas fa-align-left"></i> About the Role</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{job.description}</p>
          </div>
          {job.responsibilities.length > 0 && (
            <div className="content-card">
              <h3><i className="fas fa-list-check"></i> Responsibilities</h3>
              <ul className="bullet-list">
                {job.responsibilities.map((r, i) => (
                  <li key={i}><i className="fas fa-circle-check"></i> {r}</li>
                ))}
              </ul>
            </div>
          )}
          {job.requirements && (
            <div className="content-card">
              <h3><i className="fas fa-clipboard-check"></i> Requirements</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{job.requirements}</p>
            </div>
          )}
        </div>

        <div className="side-column">
          {job.skills.length > 0 && (
            <div className="content-card">
              <h3><i className="fas fa-code"></i> Required Skills</h3>
              <div className="skill-tags">
                {job.skills.map((s) => (
                  <span key={s} className="skill-tag-sm">{s}</span>
                ))}
              </div>
            </div>
          )}
          <div className="content-card">
            <h3><i className="fas fa-circle-info"></i> Overview</h3>
            <div className="overview-row"><span>Job Type</span><strong>{job.type}</strong></div>
            <div className="overview-row"><span>Experience</span><strong>{job.level}</strong></div>
            <div className="overview-row"><span>Work Mode</span><strong>{job.mode}</strong></div>
            <div className="overview-row"><span>Salary</span><strong>{job.salary}</strong></div>
            {fmtDeadline(job.deadline) && (
              <div className="overview-row"><span>Deadline</span><strong>{fmtDeadline(job.deadline)}</strong></div>
            )}
          </div>
        </div>
      </div>

      <ApplyModal
        key={applyingJob?.id}
        job={applyingJob}
        onClose={() => setApplyingJob(null)}
        onApplied={markApplied}
      />
    </div>
  );
};

export default JobDetails;
