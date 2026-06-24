// Application endpoints (/api/v1/applications/*).
import { api } from './client';

export function applyToJob({ job, cover_letter, expected_salary }) {
  return api.post('/applications/apply/', { job, cover_letter, expected_salary });
}

export function myApplications(status) {
  return api.get('/applications/my-applications/', {
    query: status ? { status } : undefined,
  });
}

export function applicationDetail(id) {
  return api.get(`/applications/${id}/`);
}
