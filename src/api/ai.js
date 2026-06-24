// AI endpoints — IQ test + CV analysis (/api/v1/ai/*).
import { api, request } from './client';

// ---- IQ Test ----
export function startIqTest(jobId) {
  return api.post(`/ai/iq-test/start/${jobId}/`);
}

export function submitIqTest(testId, answers) {
  // answers: [{ question_id, selected_answer }]
  return api.post(`/ai/iq-test/submit/${testId}/`, { answers });
}

export function iqTestResult(id) {
  return api.get(`/ai/iq-test/result/${id}/`);
}

export function iqLeaderboard(jobId) {
  return api.get(`/ai/iq-test/leaderboard/${jobId}/`);
}

export function iqHistory() {
  return api.get('/ai/iq-test/history/');
}

// ---- CV Analysis ----
// Uploads a CV file against a job; backend returns the parsed analysis.
export function uploadCv(jobId, file) {
  const form = new FormData();
  form.append('file', file);
  return request(`/ai/cv/upload/${jobId}/`, {
    method: 'POST',
    body: form,
    isForm: true,
  });
}
