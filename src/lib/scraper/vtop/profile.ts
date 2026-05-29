import type { VtopSession } from '@/types/auth';
import type { HostelInfo, LeaveRequest } from '@/types/hostel';
import { VTOP_BASE } from './auth';
import { parseHtml } from '@/lib/html/parser';

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

async function vtopPost(path: string, params: URLSearchParams, session: VtopSession) {
  const res = await fetch(`${VTOP_BASE}${path}`, {
    method: 'POST',
    headers: {
      Cookie: session.cookies, 'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA, Referer: `${VTOP_BASE}/vtop/open/page`,
    },
    body: params.toString(),
  });
  return res.text();
}

export function parseHostelHtml(html: string): HostelInfo {
  const root = parseHtml(html);
  const getText = (label: string): string => {
    const els = root.querySelectorAll('td, th, label, span');
    for (const el of els) {
      if (el.text.trim().toLowerCase().includes(label.toLowerCase())) {
        const next = el.nextElementSibling ?? el.parentNode?.nextElementSibling;
        if (next) return next.text.trim();
      }
    }
    return '';
  };

  return {
    blockName: getText('block') || getText('hostel block'),
    roomNumber: getText('room no') || getText('room number'),
    gender: getText('gender'),
    messType: getText('mess') || getText('food'),
    isHosteller: /hosteller/i.test(html),
  };
}

export async function fetchHostelData(session: VtopSession): Promise<HostelInfo> {
  const html = await vtopPost(
    '/vtop/studentsRecord/StudentProfileAllView',
    new URLSearchParams({ verifyMenu: 'true', authorizedID: session.userId, _csrf: session.csrfToken, nocache: Date.now().toString() }),
    session,
  );
  return parseHostelHtml(html);
}

export function parseLeaveHtml(html: string): LeaveRequest[] {
  const root = parseHtml(html);
  const leaves: LeaveRequest[] = [];

  root.querySelectorAll('table tr').forEach((row, i) => {
    if (i === 0) return;
    const cols = row.querySelectorAll('td');
    if (cols.length < 6) return;
    leaves.push({
      id: cols[0]?.text.trim() ?? String(i),
      fromDate: cols[3]?.text.trim() ?? '',
      toDate: cols[4]?.text.trim() ?? '',
      reason: cols[2]?.text.trim() ?? '',
      status: (cols[5]?.text.trim() ?? 'Pending') as LeaveRequest['status'],
      appliedOn: cols[1]?.text.trim() ?? '',
    });
  });

  return leaves;
}

export async function fetchLeaveData(session: VtopSession): Promise<LeaveRequest[]> {
  const html = await vtopPost(
    '/vtop/hostels/student/leave/1',
    new URLSearchParams({ verifyMenu: 'true', authorizedID: session.userId, _csrf: session.csrfToken, nocache: Date.now().toString() }),
    session,
  );
  return parseLeaveHtml(html);
}
