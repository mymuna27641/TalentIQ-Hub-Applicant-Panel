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
// Flow: upload -> analyze -> result (see /swagger).
//   1. POST /ai/cv/upload/{job_id}/     -> upload record (with an id)
//   2. POST /ai/cv/analyze/{upload_id}/ -> runs the AI analysis
//   3. GET  /ai/cv/result/{upload_id}/  -> the analysis result

// Uploads a CV file against a job; backend returns an upload record (with an id).
export function uploadCv(jobId, file) {
  const form = new FormData();
  form.append('file', file);
  return request(`/ai/cv/upload/${jobId}/`, {
    method: 'POST',
    body: form,
    isForm: true,
  });
}

// Triggers the AI analysis for a previously uploaded CV.
export function analyzeCv(uploadId) {
  return api.post(`/ai/cv/analyze/${uploadId}/`);
}

// Fetches the analysis result for a previously uploaded CV.
export function cvResult(uploadId) {
  return api.get(`/ai/cv/result/${uploadId}/`);
}

// Fetches the human-readable review for a previously uploaded CV.
export function cvReview(uploadId) {
  return api.get(`/ai/cv/review/${uploadId}/`);
}

// CV ranking leaderboard for a job.
export function cvLeaderboard(jobId) {
  return api.get(`/ai/cv/leaderboard/${jobId}/`);
}
