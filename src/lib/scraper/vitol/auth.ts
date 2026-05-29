import type { VitolCredentials, VtopCredentials } from '@/types/auth';
import type { VitolAssignment } from '@/types/vitol';

const VITOL_HOSTS = ['https://vitolcc.vit.ac.in', 'https://vitolcc1.vit.ac.in'];

export async function vitolLogin(creds: VtopCredentials): Promise<VitolCredentials> {
  // TODO Phase 6: implement with host failover
  // 1. GET host root → extract CSRF token + session cookie
  // 2. POST login form with credentials + CSRF
  // 3. Extract SESSION_KEY from response cookies
  void VITOL_HOSTS;
  void creds;
  throw new Error('Vitol login not yet implemented');
}

export async function fetchVitolAssignmentsData(
  _creds: VitolCredentials,
): Promise<VitolAssignment[]> {
  // TODO Phase 6
  throw new Error('fetchVitolAssignmentsData not yet implemented');
}
