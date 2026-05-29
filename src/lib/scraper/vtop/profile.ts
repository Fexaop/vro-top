import type { VtopSession } from '@/types/auth';
import type { HostelInfo, LeaveRequest } from '@/types/hostel';

export async function fetchHostelData(_session: VtopSession): Promise<HostelInfo> {
  // TODO Phase 7
  throw new Error('fetchHostelData not yet implemented');
}

export async function fetchLeaveData(_session: VtopSession): Promise<LeaveRequest[]> {
  // TODO Phase 7
  throw new Error('fetchLeaveData not yet implemented');
}
