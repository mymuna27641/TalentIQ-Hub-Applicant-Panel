// Applicant / recruiter profile endpoints (/api/v1/profile/*).
import { api } from './client';

export function getApplicantProfile() {
  return api.get('/profile/applicant/');
}

export function createApplicantProfile(payload) {
  return api.post('/profile/applicant/', payload);
}

export function updateApplicantProfile(payload) {
  return api.put('/profile/applicant/', payload);
}

export function getRecruiterProfile() {
  return api.get('/profile/recruiter/');
}
