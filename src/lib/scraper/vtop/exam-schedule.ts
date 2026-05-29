import type { VtopSession } from '@/types/auth';
import type { ExamSlot, ExamSession, ExamType } from '@/types/exam';
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

export async function fetchExamScheduleData(session: VtopSession): Promise<ExamSlot[]> {
  const html = await vtopPost(
    '/vtop/examinations/doSearchExamScheduleForStudent',
    new URLSearchParams({
      authorizedID: session.userId,
      semesterSubId: session.semesterCode,
      _csrf: session.csrfToken,
    }),
    session,
  );

  const root = parseHtml(html);
  const slots: ExamSlot[] = [];
  let currentType: string = '';

  root.querySelectorAll('table.customTable tr').forEach((row) => {
    const tds = row.querySelectorAll('td');
    // Section header row (colspan=13)
    if (tds.length === 1 && tds[0]?.getAttribute('colspan') === '13') {
      currentType = tds[0].text.trim();
      return;
    }
    if (row.classList.contains('tableHeader') || !currentType) return;
    if (tds.length < 13) return;

    slots.push({
      courseCode: tds[1]?.text.trim() ?? '',
      courseTitle: tds[2]?.text.trim() ?? '',
      classId: tds[4]?.text.trim() ?? '',
      slot: tds[5]?.text.trim() ?? '',
      examType: currentType as ExamType,
      date: tds[6]?.text.trim() ?? '',
      session: (tds[7]?.text.trim() ?? 'FN') as ExamSession,
      reportingTime: tds[8]?.text.trim() ?? '',
      examTime: tds[9]?.text.trim() ?? '',
      venue: tds[10]?.text.trim() ?? '',
      seatNumber: tds[12]?.text.trim() ?? '',
    });
  });

  return slots;
}
