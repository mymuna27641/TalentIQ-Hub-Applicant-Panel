// Job listing endpoints (/api/v1/jobs/*) plus the API → UI adapter.
import { api } from './client';

// Filter option lists (match the normalized UI values produced below).
export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
export const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead'];

// Public — no auth required.
export function listJobs(query) {
  return api.get('/jobs/', { auth: false, query });
}

export function getJob(id) {
  return api.get(`/jobs/${id}/`, { auth: false });
}

export function myPostedJobs() {
  return api.get('/jobs/my-jobs/');
}

// ---------------------------------------------------------------------------
// API ↔ UI adapter. The backend job shape (see Postman "Create Job") differs
// from the shape the job cards render, so normalize it.
// ---------------------------------------------------------------------------
const LOGO_BGS = [
  ['#f0f5ff', '#8aacef'], ['#fff7ed', '#ea580c'], ['#f0fdf4', '#16a34a'],
  ['#fdf4ff', '#c026d3'], ['#fef2f2', '#dc2626'], ['#ecfeff', '#0891b2'],
];

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'JB';
}

const TYPE_MAP = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship',
};
const LEVEL_MAP = { entry: 'Entry', mid: 'Mid', senior: 'Senior', lead: 'Lead' };

function timeAgo(iso) {
  if (!iso) return 'Recently';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatSalary(job) {
  const cur = job.salary_currency || 'USD';
  const sym = cur === 'USD' ? '$' : `${cur} `;
  const k = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : n);
  if (job.salary_min && job.salary_max) return `${sym}${k(job.salary_min)} – ${sym}${k(job.salary_max)}`;
  if (job.salary_min) return `From ${sym}${k(job.salary_min)}`;
  return 'Competitive';
}

export function normalizeJob(job, i = 0) {
  if (!job || typeof job !== 'object') return job;
  const [logoBg, logoColor] = LOGO_BGS[i % LOGO_BGS.length];
  const company = job.company_name || job.company || 'Company';
  const loc = job.location || 'Not specified';
  const mode = /remote/i.test(loc) ? 'Remote' : /hybrid/i.test(loc) ? 'Hybrid' : 'On-site';
  const resp = Array.isArray(job.responsibilities)
    ? job.responsibilities
    : String(job.responsibilities || '')
        .split(/(?:\.|\n)+/)
        .map((s) => s.trim())
        .filter(Boolean);
  return {
    id: job.id,
    title: job.title || 'Untitled role',
    company,
    logo: initials(company),
    logoBg,
    logoColor,
    location: loc,
    mode,
    type: TYPE_MAP[job.employment_type] || job.employment_type || 'Full-time',
    level: LEVEL_MAP[job.experience_level] || job.experience_level || 'Mid',
    salary: formatSalary(job),
    postedAgo: timeAgo(job.created_at),
    skills: Array.isArray(job.skills) ? job.skills : [],
    description: job.description || '',
    responsibilities: resp,
    requirements: job.requirements || '',
    deadline: job.deadline || null,
    _raw: job,
  };
}

// Unwraps DRF-style paginated responses or bare arrays.
export function normalizeJobList(payload) {
  const arr = Array.isArray(payload) ? payload : payload?.results || [];
  return arr.map((j, i) => normalizeJob(j, i));
}
