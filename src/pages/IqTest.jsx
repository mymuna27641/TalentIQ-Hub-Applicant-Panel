import { useEffect, useState } from 'react';
import { listJobs, normalizeJobList } from '../api/jobs';
import { startIqTest, submitIqTest, iqHistory } from '../api/ai';
import { errorMessage } from '../api/client';

// --- Defensive extractors (backend response shapes are not strictly typed) ---
function extractTestId(res) {
  return res?.id ?? res?.test_id ?? res?.testId ?? res?.test?.id ?? null;
}

function extractQuestions(res) {
  const arr = res?.questions || res?.items || (Array.isArray(res) ? res : []);
  if (!Array.isArray(arr)) return [];
  return arr.map((q, i) => {
    const id = q.id ?? q.question_id ?? i;
    const text = q.question ?? q.text ?? q.question_text ?? `Question ${i + 1}`;
    let options = [];
    if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
      options = Object.entries(q.options).map(([key, label]) => ({ key, label }));
    } else if (Array.isArray(q.options)) {
      options = q.options.map((label, j) => ({ key: String.fromCharCode(65 + j), label }));
    } else {
      // option_a / option_b / ... style
      options = ['a', 'b', 'c', 'd']
        .filter((l) => q[`option_${l}`] != null)
        .map((l) => ({ key: l.toUpperCase(), label: q[`option_${l}`] }));
    }
    return { id, text, options };
  });
}

function pickScore(res) {
  if (!res || typeof res !== 'object') return null;
  for (const k of ['score', 'iq_score', 'total_score', 'percentage', 'correct']) {
    if (typeof res[k] === 'number') return res[k];
  }
  return null;
}

const IqTest = () => {
  const [view, setView] = useState('home'); // home | taking | result
  const [error, setError] = useState('');

  // home state
  const [history, setHistory] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // taking state
  const [testId, setTestId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // result state
  const [result, setResult] = useState(null);

  const loadHome = async () => {
    setLoading(true);
    setError('');
    try {
      const [hist, jobsData] = await Promise.all([
        iqHistory().catch(() => []),
        listJobs().catch(() => []),
      ]);
      setHistory(Array.isArray(hist) ? hist : hist?.results || []);
      const list = normalizeJobList(jobsData);
      setJobs(list);
      if (list.length) setJobId(String(list[0].id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const start = async () => {
    if (!jobId) return;
    setStarting(true);
    setError('');
    try {
      const res = await startIqTest(jobId);
      const qs = extractQuestions(res);
      setTestId(extractTestId(res));
      setQuestions(qs);
      setAnswers({});
      setView('taking');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id] || '',
      }));
      const res = await submitIqTest(testId, payload);
      setResult(res ?? {});
      setView('result');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const backHome = () => {
    setView('home');
    setResult(null);
    setQuestions([]);
    setTestId(null);
    loadHome();
  };

  const answeredCount = Object.values(answers).filter(Boolean).length;

  // ---- Result view ----
  if (view === 'result') {
    const score = pickScore(result);
    return (
      <div className="jobs-page">
        <div className="page-header-flex" style={{ marginBottom: '1.5rem' }}>
          <div className="page-title-group">
            <h2>Test Submitted</h2>
            <p>Here's how you did.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={backHome}>
            <i className="fas fa-arrow-left"></i> Back to IQ Tests
          </button>
        </div>
        <div className="content-card" style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
          {score != null ? (
            <>
              <h3><i className="fas fa-trophy"></i> Your Score</h3>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary)' }}>{score}</div>
            </>
          ) : (
            <h3>Your answers were recorded.</h3>
          )}
          <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // ---- Taking view ----
  if (view === 'taking') {
    return (
      <div className="jobs-page">
        <div className="page-header-flex" style={{ marginBottom: '1.5rem' }}>
          <div className="page-title-group">
            <h2>IQ Test</h2>
            <p>{answeredCount} / {questions.length} answered</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={backHome}>
            <i className="fas fa-xmark"></i> Cancel
          </button>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: '1rem' }}>
            <i className="fas fa-circle-exclamation"></i> {error}
          </div>
        )}

        {questions.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-circle-question"></i>
            <h3>No questions returned</h3>
            <p>The test could not be generated. Please try again.</p>
            <button className="btn btn-primary btn-sm" onClick={backHome}>Back</button>
          </div>
        ) : (
          <>
            {questions.map((q, idx) => (
              <div className="content-card" key={q.id} style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem' }}>
                  <span style={{ color: 'var(--primary)' }}>Q{idx + 1}.</span> {q.text}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.key;
                    return (
                      <label
                        key={opt.key}
                        className={`overview-row ${selected ? 'iq-option-selected' : ''}`}
                        style={{
                          cursor: 'pointer',
                          border: `1px solid ${selected ? 'var(--primary)' : '#e2e8f0'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '0.6rem 0.9rem',
                          background: selected ? 'var(--primary-soft)' : 'transparent',
                        }}
                      >
                        <span>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={selected}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.key }))}
                            style={{ marginRight: '0.6rem' }}
                          />
                          <strong>{opt.key}.</strong> {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              className="btn btn-primary btn-block"
              disabled={submitting || answeredCount === 0}
              onClick={submit}
            >
              {submitting ? (
                <><i className="fas fa-spinner fa-spin"></i> Submitting…</>
              ) : (
                <><i className="fas fa-paper-plane"></i> Submit Answers</>
              )}
            </button>
          </>
        )}
      </div>
    );
  }

  // ---- Home view ----
  return (
    <div className="jobs-page">
      <div className="page-header-flex">
        <div className="page-title-group">
          <h2>IQ Test</h2>
          <p>Take an AI-generated assessment for a job and review your past attempts.</p>
        </div>
      </div>

      {loading ? (
        <div className="page-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading…</p>
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: '1.5rem' }}>
            <h3><i className="fas fa-play"></i> Start a new test</h3>
            {error && (
              <div className="auth-error" style={{ margin: '0.75rem 0' }}>
                <i className="fas fa-circle-exclamation"></i> {error}
              </div>
            )}
            {jobs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No jobs available to test against right now.</p>
            ) : (
              <div className="upload-controls" style={{ alignItems: 'flex-end', gap: '1rem' }}>
                <div className="role-select-group" style={{ flex: 1 }}>
                  <label className="input-label">Choose a job</label>
                  <select className="modern-select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title} — {j.company}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={start} disabled={starting}>
                  {starting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Generating…</>
                  ) : (
                    <><i className="fas fa-wand-magic-sparkles"></i> Start Test</>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="leaderboard-card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #eef1f6' }}>
              <h3 style={{ margin: 0 }}><i className="fas fa-clock-rotate-left"></i> Past Attempts</h3>
            </div>
            {history.length === 0 ? (
              <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                <i className="fas fa-clipboard-list"></i>
                <h3>No attempts yet</h3>
                <p>Your completed IQ tests will appear here.</p>
              </div>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Job</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const score = pickScore(h);
                    const date = h.created_at || h.completed_at || h.date;
                    return (
                      <tr key={h.id ?? i}>
                        <td><span className="user-name">#{h.id ?? i + 1}</span></td>
                        <td><span className="user-role">{h.job_title || h.job?.title || (h.job ? `Job ${h.job}` : '—')}</span></td>
                        <td><strong>{score != null ? score : '—'}</strong></td>
                        <td><span className="user-role">{date ? new Date(date).toLocaleDateString() : '—'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default IqTest;
