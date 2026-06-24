import { useState } from 'react';
import { applyToJob } from '../api/applications';
import { errorMessage } from '../api/client';

// Application modal. `job` controls visibility (null = closed).
// Parents pass `key={job?.id}` so the form/success state resets per job.
const ApplyModal = ({ job, onClose, onApplied }) => {
  const [form, setForm] = useState({ coverLetter: '', expectedSalary: '' });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!job) return null;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await applyToJob({
        job: job.id,
        cover_letter: form.coverLetter,
        expected_salary: form.expectedSalary ? Number(form.expectedSalary) : undefined,
      });
      setSubmitted(true);
      onApplied?.(job.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className="success-check"><i className="fas fa-check"></i></div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Application sent!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Your application for <strong>{job.title}</strong> at {job.company} has been submitted.
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              <i className="fas fa-thumbs-up"></i> Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Apply to {job.title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {job.company} · {job.location}
                </p>
              </div>
              <button type="button" className="btn-icon-only" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-form-group">
                <label>Cover Letter</label>
                <textarea
                  name="coverLetter"
                  value={form.coverLetter}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Tell them why you're a great fit..."
                  required
                />
              </div>
              <div className="modal-form-group">
                <label>Expected Salary <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional)</span></label>
                <input
                  type="number"
                  name="expectedSalary"
                  value={form.expectedSalary}
                  onChange={handleChange}
                  placeholder="90000"
                  min="0"
                />
              </div>
              {error && (
                <div className="auth-error" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  <i className="fas fa-circle-exclamation"></i> {error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? (
                  <><i className="fas fa-spinner fa-spin"></i> Submitting…</>
                ) : (
                  <><i className="fas fa-paper-plane"></i> Submit Application</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApplyModal;
