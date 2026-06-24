import { useNavigate } from 'react-router-dom';

// Reusable job listing card.
const JobCard = ({ job, onApply, applied = false }) => {
  const navigate = useNavigate();

  return (
    <div className="job-card" onClick={() => navigate(`/jobs/${job.id}`)}>
      <div className="job-card-top">
        <div className="job-logo" style={{ background: job.logoBg, color: job.logoColor }}>
          {job.logo}
        </div>
      </div>

      <div className="job-card-body">
        <h3 className="job-title">{job.title}</h3>
        <p className="job-company">
          <i className="fas fa-building"></i> {job.company}
        </p>

        <div className="job-meta-row">
          <span className="job-meta"><i className="fas fa-location-dot"></i> {job.location}</span>
          <span className="job-meta"><i className="fas fa-laptop-house"></i> {job.mode}</span>
        </div>

        <div className="job-tags">
          <span className="job-tag">{job.type}</span>
          <span className="job-tag">{job.level}</span>
        </div>

        <div className="skill-tags">
          {job.skills.slice(0, 4).map((s) => (
            <span key={s} className="skill-tag-sm">{s}</span>
          ))}
        </div>
      </div>

      <div className="job-card-footer">
        <div className="job-salary">
          <i className="fas fa-sack-dollar"></i> {job.salary}
          <span className="job-posted">· {job.postedAgo}</span>
        </div>
        {applied ? (
          <button className="btn btn-secondary btn-sm" disabled onClick={(e) => e.stopPropagation()}>
            <i className="fas fa-circle-check"></i> Applied
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
          >
            <i className="fas fa-paper-plane"></i> Apply
          </button>
        )}
      </div>
    </div>
  );
};

export default JobCard;
