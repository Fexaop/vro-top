import type { LmsCredentials, VtopCredentials } from '@/types/auth';
import type { LmsAssignment } from '@/types/lms';

const LMS_BASE = 'https://lms.vit.ac.in';

export async function lmsLogin(creds: VtopCredentials): Promise<LmsCredentials> {
  const res = await fetch(`${LMS_BASE}/login/token.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: creds.username,
      password: creds.password,
      service: 'moodle_mobile_app',
    }).toString(),
  });
  const data = (await res.json()) as { token?: string; userid?: number; error?: string };
  if (data.error || !data.token) {
    throw new Error(data.error ?? 'LMS login failed');
  }
  return { token: data.token, userId: data.userid ?? 0 };
}

export async function fetchLmsAssignmentsData(_creds: LmsCredentials): Promise<LmsAssignment[]> {
  // TODO Phase 6
  throw new Error('fetchLmsAssignmentsData not yet implemented');
}
