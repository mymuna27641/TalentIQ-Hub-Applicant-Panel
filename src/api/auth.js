// Auth + identity endpoints (/api/v1/auth/*).
import { api, tokens } from './client';

// Backend may return { access, refresh } directly or nested under `tokens`.
function extractTokens(data) {
  const access = data?.access || data?.access_token || data?.tokens?.access;
  const refresh = data?.refresh || data?.refresh_token || data?.tokens?.refresh;
  return { access, refresh };
}

export async function login({ email, password }) {
  const data = await api.post('/auth/login/', { email, password }, { auth: false });
  const t = extractTokens(data);
  if (t.access) tokens.set(t);
  return data;
}

export async function register({ email, full_name, password, role = 'candidate' }) {
  return api.post(
    '/auth/register/',
    { email, full_name, password, role },
    { auth: false }
  );
}

export function getMe() {
  return api.get('/auth/me/');
}

export function updateMe(payload) {
  return api.put('/auth/me/', payload);
}

export function logout() {
  tokens.clear();
}

export function isAuthenticated() {
  return Boolean(tokens.access);
}
