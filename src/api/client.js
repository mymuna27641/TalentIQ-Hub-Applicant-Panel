// ---------------------------------------------------------------------------
// Core API client for the TalentIQ Hub backend (see ai_requirement Postman
// collection). Wraps fetch with JWT auth, automatic token refresh and a small
// helper so pages can gracefully fall back to mock data when the backend is
// offline.
// ---------------------------------------------------------------------------

export const API_BASE =
  import.meta.env?.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1';

const ACCESS_KEY = 'tiq_access_token';
const REFRESH_KEY = 'tiq_refresh_token';

// --- token storage --------------------------------------------------------
export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY) || '';
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY) || '';
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// Error type that carries whether the failure was a network/offline error
// (so callers know it is safe to fall back to mock data) vs. a real 4xx/5xx.
export class ApiError extends Error {
  constructor(message, { status = 0, data = null, offline = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.offline = offline;
  }
}

async function parse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

let refreshing = null;

async function tryRefresh() {
  if (!tokens.refresh) return false;
  // De-dupe concurrent refreshes.
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await parse(res);
        if (data?.access) {
          tokens.set({ access: data.access, refresh: data.refresh });
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/**
 * Low-level request helper.
 * @param {string} path  e.g. '/jobs/'
 * @param {object} opts  { method, body, auth, isForm, query, retry }
 */
export async function request(path, opts = {}) {
  const {
    method = 'GET',
    body,
    auth = true,
    isForm = false,
    query,
    retry = true,
  } = opts;

  let url = `${API_BASE}${path}`;
  if (query && typeof query === 'object') {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {};
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError('Network error — backend unreachable.', { offline: true });
  }

  // Auto-refresh once on 401.
  if (res.status === 401 && auth && retry && tokens.refresh) {
    const ok = await tryRefresh();
    if (ok) return request(path, { ...opts, retry: false });
  }

  const data = await parse(res);
  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message || data.error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(typeof msg === 'string' ? msg : 'Request failed', {
      status: res.status,
      data,
    });
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

// Human-readable message for an error thrown by `request`.
export function errorMessage(err) {
  if (err instanceof ApiError) {
    if (err.offline) return 'Cannot reach the server. Check your connection and try again.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
