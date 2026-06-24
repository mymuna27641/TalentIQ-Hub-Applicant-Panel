import { useEffect, useMemo, useState } from 'react';
import JobCard from '../components/JobCard';
import ApplyModal from '../components/ApplyModal';
import {
  listJobs,
  normalizeJobList,
  JOB_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
} from '../api/jobs';
import { errorMessage } from '../api/client';
import { usePoll } from '../hooks/usePoll';
import { useData } from '../context/DataContext';

const BrowseJobs = () => {
  const { ensureApplications, hasAppliedTo, markApplied } = useData();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [mode, setMode] = useState('All');
  const [level, setLevel] = useState('All');
  const [applyingJob, setApplyingJob] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // `silent` background refreshes keep the list current (newly posted jobs)
  // without flashing the full-page spinner or clobbering an existing list.
  const load = async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await listJobs();
      setJobs(normalizeJobList(data));
    } catch (err) {
      if (!silent) setError(errorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    ensureApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up newly posted jobs on an interval and when the tab regains focus.
  usePoll(() => load({ silent: true }), { interval: 20000 });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.skills.some((s) => s.toLowerCase().includes(q));
      const matchesType = type === 'All' || job.type === type;
      const matchesMode = mode === 'All' || job.mode === mode;
      const matchesLevel = level === 'All' || job.level === level;
      return matchesQuery && matchesType && matchesMode && matchesLevel;
    });
  }, [jobs, query, type, mode, level]);

  const clearFilters = () => {
    setQuery('');
    setType('All');
    setMode('All');
    setLevel('All');
  };

  const hasActiveFilters = type !== 'All' || mode !== 'All' || level !== 'All' || query !== '';

  return (
    <div className="jobs-page">
      <div className="page-header-flex">
        <div className="page-title-group">
          <h2>Browse Jobs</h2>
          <p>{loading ? 'Loading opportunities…' : `${filtered.length} opportunities matching your search.`}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="filter-panel">
        <div className="filter-search">
          <div className="search-bar" style={{ width: '100%' }}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by title, company, skill or location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-controls">
          <select className="modern-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="All">All Types</option>
            {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="modern-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="All">Any Location</option>
            {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="modern-select" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="All">All Levels</option>
            {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {hasActiveFilters && (
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
              <i className="fas fa-xmark"></i> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="page-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading opportunities…</p>
        </div>
      ) : error ? (
        <div className="page-state error">
          <i className="fas fa-triangle-exclamation"></i>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={load}>
            <i className="fas fa-rotate-right"></i> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-magnifying-glass"></i>
          <h3>No jobs found</h3>
          <p>{jobs.length === 0 ? 'There are no open positions right now.' : 'Try adjusting your search or filters.'}</p>
          {hasActiveFilters && (
            <button className="btn btn-primary btn-sm" onClick={clearFilters}>Reset filters</button>
          )}
        </div>
      ) : (
        <div className="jobs-grid">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onApply={setApplyingJob} applied={hasAppliedTo(job.id)} />
          ))}
        </div>
      )}

      <ApplyModal
        key={applyingJob?.id}
        job={applyingJob}
        onClose={() => setApplyingJob(null)}
        onApplied={markApplied}
      />
    </div>
  );
};

export default BrowseJobs;
