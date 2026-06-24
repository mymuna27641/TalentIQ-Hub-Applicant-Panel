import { useEffect, useRef, useState } from 'react';
import { listJobs, normalizeJobList } from '../api/jobs';
import { uploadCv } from '../api/ai';
import { errorMessage } from '../api/client';

const ACCEPTED = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];

// Pulls the headline score out of whatever shape the backend returns.
function pickScore(result) {
  if (!result || typeof result !== 'object') return null;
  const keys = ['score', 'match_score', 'ats_score', 'overall_score', 'total_score'];
  for (const k of keys) {
    if (typeof result[k] === 'number') return Math.round(result[k]);
  }
  return null;
}

// Collects simple string/number fields to display as a summary.
function summaryFields(result) {
  if (!result || typeof result !== 'object') return [];
  const skip = new Set(['id', 'created_at', 'updated_at', 'file', 'user', 'job']);
  return Object.entries(result)
    .filter(([k, v]) => !skip.has(k) && (typeof v === 'string' || typeof v === 'number') && String(v).length < 200)
    .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: v }));
}

function listFields(result) {
  if (!result || typeof result !== 'object') return [];
  return Object.entries(result)
    .filter(([, v]) => Array.isArray(v) && v.length && v.every((x) => typeof x === 'string'))
    .map(([k, v]) => ({ label: k.replace(/_/g, ' '), items: v }));
}

const Upload = () => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState('');
  const [jobsLoading, setJobsLoading] = useState(true);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      setJobsLoading(true);
      try {
        const data = await listJobs();
        const list = normalizeJobList(data);
        setJobs(list);
        if (list.length) setJobId(String(list[0].id));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setJobsLoading(false);
      }
    })();
  }, []);

  const validate = (f) => {
    if (!f) return false;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported file type. Use ${ACCEPTED.join(', ')}.`);
      return false;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File is larger than 5 MB.');
      return false;
    }
    setError('');
    return true;
  };

  const onFiles = (files) => {
    const f = files?.[0];
    if (validate(f)) setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  const analyze = async () => {
    if (!file || !jobId) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const data = await uploadCv(jobId, file);
      setResult(data ?? {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setFile(null);
    setError('');
  };

  const fileExt = file ? file.name.split('.').pop().toUpperCase() : '';
  const score = pickScore(result);
  const fields = summaryFields(result);
  const lists = listFields(result);

  // ---- Result view ----
  if (result) {
    return (
      <div className="upload-page">
        <div className="page-header-flex" style={{ marginBottom: '1.5rem' }}>
          <div className="page-title-group">
            <h2>CV Analysis Result</h2>
            <p>Analysis for your uploaded resume against the selected job.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={reset}>
            <i className="fas fa-cloud-arrow-up"></i> Analyze another
          </button>
        </div>

        <div className="section-grid">
          <div className="main-column">
            {fields.length > 0 && (
              <div className="content-card">
                <h3><i className="fas fa-clipboard-list"></i> Summary</h3>
                {fields.map((f) => (
                  <div className="overview-row" key={f.label}>
                    <span style={{ textTransform: 'capitalize' }}>{f.label}</span>
                    <strong style={{ textAlign: 'right', maxWidth: '60%' }}>{String(f.value)}</strong>
                  </div>
                ))}
              </div>
            )}
            {lists.map((l) => (
              <div className="content-card" key={l.label}>
                <h3 style={{ textTransform: 'capitalize' }}><i className="fas fa-list-check"></i> {l.label}</h3>
                <ul className="bullet-list">
                  {l.items.map((it, i) => (
                    <li key={i}><i className="fas fa-circle-check"></i> {it}</li>
                  ))}
                </ul>
              </div>
            ))}
            {fields.length === 0 && lists.length === 0 && (
              <div className="content-card">
                <h3><i className="fas fa-code"></i> Raw Response</h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
          <div className="side-column">
            {score != null && (
              <div className="content-card" style={{ textAlign: 'center' }}>
                <h3><i className="fas fa-gauge-high"></i> Match Score</h3>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', padding: '0.5rem 0' }}>{score}%</div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{ width: `${score}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Upload form ----
  return (
    <div className="upload-page">
      <div className="page-header-flex" style={{ marginBottom: '1.5rem' }}>
        <div className="page-title-group">
          <h2>CV Analysis</h2>
          <p>Upload your resume and analyze it against a specific job.</p>
        </div>
      </div>

      <div className="upload-grid">
        <div className="grid-card upload-card">
          <div className="upload-controls" style={{ marginBottom: '1rem' }}>
            <div className="role-select-group" style={{ width: '100%' }}>
              <label className="input-label">Target job</label>
              {jobsLoading ? (
                <p className="dropzone-hint">Loading jobs…</p>
              ) : jobs.length === 0 ? (
                <p className="dropzone-hint">No jobs available to analyze against.</p>
              ) : (
                <select className="modern-select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title} — {j.company}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div
            className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(',')}
              hidden
              onChange={(e) => onFiles(e.target.files)}
            />

            {!file ? (
              <>
                <div className="dropzone-icon"><i className="fas fa-cloud-arrow-up"></i></div>
                <h3>Drag & drop your resume</h3>
                <p>or <span className="link">browse files</span> from your computer</p>
                <div className="dropzone-formats">
                  {ACCEPTED.map((f) => <span key={f} className="format-chip">{f.replace('.', '').toUpperCase()}</span>)}
                </div>
                <p className="dropzone-hint">Max 5 MB</p>
              </>
            ) : (
              <div className="file-preview">
                <div className="file-thumb">
                  <i className="fas fa-file-lines"></i>
                  <span className="file-ext">{fileExt}</span>
                </div>
                <div className="file-info">
                  <h4>{file.name}</h4>
                  <p>{(file.size / 1024).toFixed(0)} KB · Ready to analyze</p>
                </div>
                <button
                  className="btn-icon-only file-remove"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                  title="Remove file"
                >
                  <i className="fas fa-trash-can"></i>
                </button>
              </div>
            )}
          </div>

          {error && <p className="upload-error"><i className="fas fa-circle-exclamation"></i> {error}</p>}

          <div className="upload-controls">
            <button
              className="btn btn-primary analyze-btn"
              disabled={!file || !jobId || analyzing}
              onClick={analyze}
            >
              {analyzing ? (
                <><i className="fas fa-spinner fa-spin"></i> Analyzing…</>
              ) : (
                <><i className="fas fa-wand-magic-sparkles"></i> Analyze Resume</>
              )}
            </button>
          </div>
        </div>

        <div className="upload-side">
          <div className="grid-card info-card">
            <h3><i className="fas fa-circle-info"></i> How it works</h3>
            <ul className="check-list">
              <li><i className="fas fa-briefcase"></i> Pick the job you're targeting</li>
              <li><i className="fas fa-file-arrow-up"></i> Upload your latest resume</li>
              <li><i className="fas fa-robot"></i> Our AI scores it against the role</li>
              <li><i className="fas fa-lightbulb"></i> Review the feedback and improve</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
