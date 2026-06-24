import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getApplicantProfile,
  createApplicantProfile,
  updateApplicantProfile,
} from '../api/profile';
import { updateMe } from '../api/auth';
import { errorMessage, ApiError } from '../api/client';

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'U';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  const fullName = user?.full_name || '';
  const email = user?.email || '';

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getApplicantProfile();
      setProfile(data || {});
      setHasProfile(true);
    } catch (err) {
      // 404 = profile not created yet; show an empty profile the user can fill.
      if (err instanceof ApiError && err.status === 404) {
        setProfile({});
        setHasProfile(false);
      } else {
        setLoadError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = () => {
    setForm({
      full_name: fullName,
      headline: profile?.headline || '',
      location: profile?.location || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
      skills: (profile?.skills || []).join(', '),
      experience_level: profile?.experience_level || '',
      desired_role: profile?.desired_role || '',
      expected_salary: profile?.expected_salary || '',
      linkedin_url: profile?.linkedin_url || '',
      github_url: profile?.github_url || '',
      portfolio_url: profile?.portfolio_url || '',
      is_open_to_work: profile?.is_open_to_work ?? true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      headline: form.headline,
      location: form.location,
      phone: form.phone,
      bio: form.bio,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      experience_level: form.experience_level || undefined,
      desired_role: form.desired_role || undefined,
      expected_salary: form.expected_salary ? Number(form.expected_salary) : undefined,
      linkedin_url: form.linkedin_url || undefined,
      github_url: form.github_url || undefined,
      portfolio_url: form.portfolio_url || undefined,
      is_open_to_work: form.is_open_to_work,
    };
    try {
      if (form.full_name && form.full_name !== fullName) {
        await updateMe({ full_name: form.full_name });
        setUser((u) => (u ? { ...u, full_name: form.full_name } : u));
      }
      const saved = hasProfile
        ? await updateApplicantProfile(payload)
        : await createApplicantProfile(payload);
      setProfile(saved && typeof saved === 'object' ? saved : { ...profile, ...payload });
      setHasProfile(true);
      setIsModalOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-state">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading your profile…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-state error">
        <i className="fas fa-triangle-exclamation"></i>
        <p>{loadError}</p>
        <button className="btn btn-primary btn-sm" onClick={load}>
          <i className="fas fa-rotate-right"></i> Retry
        </button>
      </div>
    );
  }

  const p = profile || {};
  const skills = p.skills || [];

  return (
    <div className="profile-container">
      <div className="profile-hero-card">
        <div className="profile-identity">
          <div className="profile-avatar-large">{initialsOf(fullName || email)}</div>
          <div className="profile-info-group">
            <div className="profile-name-row">
              <h2>{fullName || 'Your name'}</h2>
              {p.is_open_to_work && <span className="status-indicator online">Open to Work</span>}
            </div>
            <p className="profile-title">{p.headline || 'Add a professional headline'}</p>
            <div className="profile-meta-tags">
              {p.location && <span><i className="fas fa-map-marker-alt"></i> {p.location}</span>}
              {email && <span><i className="fas fa-envelope"></i> {email}</span>}
              {p.phone && <span><i className="fas fa-phone"></i> {p.phone}</span>}
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={openModal} className="btn btn-primary">
            <i className="fas fa-pen"></i> {hasProfile ? 'Edit Profile' : 'Create Profile'}
          </button>
        </div>
      </div>

      {!hasProfile && (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <i className="fas fa-id-card"></i>
          <h3>Complete your profile</h3>
          <p>Add your headline, skills and experience so recruiters can find you.</p>
        </div>
      )}

      {skills.length > 0 && (
        <div className="badges-row">
          {skills.map((s) => (
            <span key={s} className="profile-badge">{s}</span>
          ))}
        </div>
      )}

      <div className="section-grid">
        <div className="main-column">
          <div className="content-card">
            <h3><i className="fas fa-info-circle"></i> About</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              {p.bio || 'Tell recruiters about yourself by editing your profile.'}
            </p>
          </div>

          <div className="content-card">
            <h3><i className="fas fa-list-check"></i> At a Glance</h3>
            <div className="overview-row"><span>Experience Level</span><strong>{p.experience_level || '—'}</strong></div>
            <div className="overview-row"><span>Desired Role</span><strong>{p.desired_role || '—'}</strong></div>
            <div className="overview-row"><span>Expected Salary</span><strong>{p.expected_salary ? `$${Number(p.expected_salary).toLocaleString()}` : '—'}</strong></div>
            <div className="overview-row"><span>Open to Work</span><strong>{p.is_open_to_work ? 'Yes' : 'No'}</strong></div>
          </div>
        </div>

        <div className="side-column">
          <div className="content-card">
            <h3><i className="fas fa-link"></i> Links</h3>
            <div className="overview-row"><span>LinkedIn</span><strong>{p.linkedin_url ? <a href={p.linkedin_url} target="_blank" rel="noreferrer">Profile</a> : '—'}</strong></div>
            <div className="overview-row"><span>GitHub</span><strong>{p.github_url ? <a href={p.github_url} target="_blank" rel="noreferrer">Profile</a> : '—'}</strong></div>
            <div className="overview-row"><span>Portfolio</span><strong>{p.portfolio_url ? <a href={p.portfolio_url} target="_blank" rel="noreferrer">Visit</a> : '—'}</strong></div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h2>{hasProfile ? 'Edit Profile' : 'Create Profile'}</h2>
                <button type="button" className="close-modal" onClick={() => setIsModalOpen(false)}>&times;</button>
              </div>
              <div className="modal-body">
                {error && (
                  <div className="auth-error"><i className="fas fa-circle-exclamation"></i> {error}</div>
                )}
                <div className="modal-form-group">
                  <label>Full Name</label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="modal-form-group">
                  <label>Professional Headline</label>
                  <input type="text" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Senior Python Developer" />
                </div>
                <div className="modal-form-group">
                  <label>Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="New York, USA" />
                </div>
                <div className="modal-form-group">
                  <label>Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
                </div>
                <div className="modal-form-group">
                  <label>Skills <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(comma separated)</span></label>
                  <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, Django, PostgreSQL" />
                </div>
                <div className="modal-form-group">
                  <label>Experience Level</label>
                  <input type="text" value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })} placeholder="3-5" />
                </div>
                <div className="modal-form-group">
                  <label>Desired Role</label>
                  <input type="text" value={form.desired_role} onChange={(e) => setForm({ ...form, desired_role: e.target.value })} placeholder="Backend Engineer" />
                </div>
                <div className="modal-form-group">
                  <label>Expected Salary</label>
                  <input type="number" min="0" value={form.expected_salary} onChange={(e) => setForm({ ...form, expected_salary: e.target.value })} placeholder="90000" />
                </div>
                <div className="modal-form-group">
                  <label>LinkedIn URL</label>
                  <input type="url" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" />
                </div>
                <div className="modal-form-group">
                  <label>GitHub URL</label>
                  <input type="url" value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/…" />
                </div>
                <div className="modal-form-group">
                  <label>Portfolio URL</label>
                  <input type="url" value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} placeholder="https://…" />
                </div>
                <div className="modal-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={form.is_open_to_work} onChange={(e) => setForm({ ...form, is_open_to_work: e.target.checked })} style={{ width: 'auto' }} />
                    Open to work
                  </label>
                </div>
                <div className="modal-form-group">
                  <label>About</label>
                  <textarea rows="4" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="5+ years building scalable backend systems." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
