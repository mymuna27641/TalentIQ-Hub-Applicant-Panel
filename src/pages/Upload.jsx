import { useEffect, useRef, useState } from 'react';
import { listJobs, normalizeJobList } from '../api/jobs';
import { uploadCv, analyzeCv, cvResult } from '../api/ai';
import { errorMessage } from '../api/client';

const ACCEPTED = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The backend shape is not strictly typed, so every reader below is defensive.

// The id returned by the upload call, used to fetch the analysis result.
function extractUploadId(res) {
  return res?.id ?? res?.upload_id ?? res?.uploadId ?? res?.cv_id ?? res?.upload?.id ?? null;
}

// Whether a fetched result is still being processed (so we should keep polling).
function isPending(res) {
  const status = (res?.status ?? res?.state ?? '').toString().toLowerCase();
  return ['pending', 'processing', 'in_progress', 'queued', 'running'].includes(status);
}

// Some backends wrap the analysis under a container key — unwrap one level.
function unwrap(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  const keys = Object.keys(result);
  if (keys.length === 1) {
    const inner = result[keys[0]];
    if (inner && typeof inner === 'object') return inner;
  }
  for (const k of ['analysis', 'result', 'data', 'cv_analysis', 'report']) {
    if (result[k] && typeof result[k] === 'object') return result[k];
  }
  return result;
}

function numberFrom(v) {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

// Pulls the headline score out of whatever shape the backend returns.
function pickScore(result) {
  if (!result || typeof result !== 'object') return null;
  const keys = [
    'score', 'match_score', 'ats_score', 'overall_score', 'total_score',
    'matching_score', 'match_percentage', 'fit_score', 'percentage',
  ];
  for (const k of keys) {
    const n = numberFrom(result[k]);
    if (n != null) return Math.round(n);
  }
  return null;
}

function pickText(result, keys) {
  if (!result || typeof result !== 'object') return null;
  for (const k of keys) {
    const v = result[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return null;
}

// Normalize an array of strings OR objects into display strings.
function toItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => {
      if (typeof x === 'string') return x.trim();
      if (typeof x === 'number') return String(x);
      if (x && typeof x === 'object') {
        for (const k of ['text', 'name', 'skill', 'keyword', 'title', 'label', 'description', 'value']) {
          if (typeof x[k] === 'string' && x[k].trim()) return x[k].trim();
        }
      }
      return null;
    })
    .filter(Boolean);
}

// Read the first array-bearing key that yields displayable items.
function pickList(result, keys) {
  if (!result || typeof result !== 'object') return [];
  for (const k of keys) {
    const items = toItems(result[k]);
    if (items.length) return items;
  }
  return [];
}

const KNOWN_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'file', 'user', 'job', 'job_id',
  'score', 'match_score', 'ats_score', 'overall_score', 'total_score',
  'matching_score', 'match_percentage', 'fit_score', 'percentage',
  'summary', 'feedback', 'overall_feedback', 'comment', 'message',
  'analysis_summary', 'conclusion', 'verdict',
  'strengths', 'pros', 'weaknesses', 'cons', 'gaps',
  'areas_for_improvement', 'improvements',
  'matched_skills', 'matching_skills', 'matched_keywords', 'present_skills', 'skills_matched',
  'missing_skills', 'missing_keywords', 'skills_missing', 'absent_skills',
  'recommendations', 'suggestions', 'tips',
]);

// Anything not surfaced by a known section — shown generically so nothing is hidden.
function extraFields(result) {
  if (!result || typeof result !== 'object') return [];
  return Object.entries(result)
    .filter(([k, v]) => !KNOWN_KEYS.has(k) && (typeof v === 'string' || typeof v === 'number') && String(v).length < 200)
    .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: v }));
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
      // 1) Upload the CV — this returns an upload record with an id.
      const upload = await uploadCv(jobId, file);
      const uploadId = extractUploadId(upload);

      if (uploadId == null) {
        // No id to continue with — fall back to whatever upload returned.
        setResult(upload ?? {});
        return;
      }

      // 2) Trigger the AI analysis. Some of these may also return the result
      //    directly; if so, use it unless it's still marked as processing.
      let analysis = null;
      try {
        analysis = await analyzeCv(uploadId);
      } catch {
        // Analysis may already exist (or run automatically) — fall through to result.
      }

      // 3) Fetch the result. Analysis can be async, so poll a few times while
      //    the backend reports it's still processing.
      let res = analysis && !isPending(analysis) ? analysis : null;
      for (let attempt = 0; attempt < 6 && (res == null || isPending(res)); attempt++) {
        try {
          res = await cvResult(uploadId);
        } catch {
          res = null;
        }
        if (res && !isPending(res)) break;
        await sleep(1500);
      }
      setResult(res ?? analysis ?? upload ?? {});
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

  const analysis = unwrap(result);
  const score = pickScore(analysis);
  const summaryText = pickText(analysis, [
    'summary', 'feedback', 'overall_feedback', 'analysis_summary',
    'conclusion', 'verdict', 'comment', 'message',
  ]);
  const strengths = pickList(analysis, ['strengths', 'pros']);
  const weaknesses = pickList(analysis, ['weaknesses', 'cons', 'gaps', 'areas_for_improvement', 'improvements']);
  const matched = pickList(analysis, ['matched_skills', 'matching_skills', 'matched_keywords', 'present_skills', 'skills_matched']);
  const missing = pickList(analysis, ['missing_skills', 'missing_keywords', 'skills_missing', 'absent_skills']);
  const suggestions = pickList(analysis, ['recommendations', 'suggestions', 'tips']);
  const extras = extraFields(analysis);

  const hasContent =
    score != null || summaryText || strengths.length || weaknesses.length ||
    matched.length || missing.length || suggestions.length || extras.length;

  const scoreColor = score == null ? 'var(--primary)'
    : score >= 70 ? 'var(--success)'
    : score >= 40 ? 'var(--warning)'
    : 'var(--danger)';

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
            {summaryText && (
              <div className="content-card">
                <h3><i className="fas fa-clipboard-list"></i> Summary</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{summaryText}</p>
              </div>
            )}

            {(matched.length > 0 || missing.length > 0) && (
              <div className="content-card">
                <h3><i className="fas fa-list-check"></i> Skills Match</h3>
                {matched.length > 0 && (
                  <>
                    <strong style={{ color: 'var(--success)', display: 'block', margin: '0.5rem 0 0.4rem' }}>
                      <i className="fas fa-circle-check"></i> Matched ({matched.length})
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {matched.map((s, i) => (
                        <span key={i} className="format-chip" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>{s}</span>
                      ))}
                    </div>
                  </>
                )}
                {missing.length > 0 && (
                  <>
                    <strong style={{ color: 'var(--danger)', display: 'block', margin: '1rem 0 0.4rem' }}>
                      <i className="fas fa-circle-xmark"></i> Missing ({missing.length})
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {missing.map((s, i) => (
                        <span key={i} className="format-chip" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {strengths.length > 0 && (
              <div className="content-card">
                <h3><i className="fas fa-thumbs-up"></i> Strengths</h3>
                <ul className="bullet-list">
                  {strengths.map((it, i) => (
                    <li key={i}><i className="fas fa-circle-check" style={{ color: 'var(--success)' }}></i> {it}</li>
                  ))}
                </ul>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="content-card">
                <h3><i className="fas fa-triangle-exclamation"></i> Areas to Improve</h3>
                <ul className="bullet-list">
                  {weaknesses.map((it, i) => (
                    <li key={i}><i className="fas fa-circle-arrow-up" style={{ color: 'var(--warning)' }}></i> {it}</li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="content-card">
                <h3><i className="fas fa-lightbulb"></i> Recommendations</h3>
                <ul className="bullet-list">
                  {suggestions.map((it, i) => (
                    <li key={i}><i className="fas fa-arrow-right" style={{ color: 'var(--primary)' }}></i> {it}</li>
                  ))}
                </ul>
              </div>
            )}

            {extras.length > 0 && (
              <div className="content-card">
                <h3><i className="fas fa-circle-info"></i> Details</h3>
                {extras.map((f) => (
                  <div className="overview-row" key={f.label}>
                    <span style={{ textTransform: 'capitalize' }}>{f.label}</span>
                    <strong style={{ textAlign: 'right', maxWidth: '60%' }}>{String(f.value)}</strong>
                  </div>
                ))}
              </div>
            )}

            {!hasContent && (
              <div className="content-card">
                <h3><i className="fas fa-circle-check" style={{ color: 'var(--success)' }}></i> Analysis complete</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>
                  The server didn't return a detailed breakdown for this resume. Here's the raw response:
                </p>
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
                <div style={{ fontSize: '3rem', fontWeight: 800, color: scoreColor, padding: '0.5rem 0' }}>{score}%</div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreColor }}></div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.75rem' }}>
                  {score >= 70 ? 'Strong match for this role.'
                    : score >= 40 ? 'Partial match — review the gaps.'
                    : 'Low match — consider tailoring your resume.'}
                </p>
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
