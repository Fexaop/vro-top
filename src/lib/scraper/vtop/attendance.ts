import type { VtopSession } from '@/types/auth';
import type { AttendanceCourse, DayAttendance, PeriodAttendance, TimetableEntry } from '@/types/attendance';
import { VTOP_BASE } from './auth';
import { parseHtml, tableToRows } from '@/lib/html/parser';

const VTOP_UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

async function vtopPost(path: string, params: URLSearchParams, session: VtopSession): Promise<string> {
  const res = await fetch(`${VTOP_BASE}${path}`, {
    method: 'POST',
    headers: {
      Cookie: session.cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': VTOP_UA,
      Referer: `${VTOP_BASE}/vtop/open/page`,
    },
    body: params.toString(),
  });
  return res.text();
}

export async function fetchAttendanceData(session: VtopSession): Promise<AttendanceCourse[]> {
  const html = await vtopPost(
    '/vtop/processViewStudentAttendance',
    new URLSearchParams({
      authorizedID: session.userId,
      semesterSubId: session.semesterCode,
      _csrf: session.csrfToken,
      x: Date.now().toString(),
    }),
    session,
  );

  const root = parseHtml(html);
  const rows = root.querySelectorAll('#getStudentDetails table tbody tr');
  const courses: AttendanceCourse[] = [];

  for (const row of rows) {
    const cols = row.querySelectorAll('td');
    if (cols.length < 12) continue;

    const slotName = cols[4]?.text.trim() ?? '';
    const suffix = slotName.startsWith('L') ? '(L)' : '(T)';
    const attended = parseInt(cols[9]?.text.trim() ?? '0', 10);
    const total = parseInt(cols[10]?.text.trim() ?? '0', 10);
    const percent = total > 0 ? Math.round((attended / total) * 100) : 0;

    const viewOnclick = row.querySelector('td:nth-child(14) a')?.getAttribute('onclick') ?? null;

    courses.push({
      courseCode: (cols[1]?.text.trim() ?? '') + suffix,
      courseTitle: cols[2]?.text.trim() ?? '',
      courseType: cols[3]?.text.trim() ?? '',
      slot: slotName,
      faculty: (cols[5]?.text ?? '').replace(/\s+/g, ' ').trim(),
      totalClasses: total,
      attended,
      odHours: 0,
      percentage: percent,
      absentDates: [],
      _viewOnclick: viewOnclick,
    } as AttendanceCourse & { _viewOnclick: string | null });
  }

  return courses;
}

export async function fetchDayAttendanceData(
  session: VtopSession,
  courseCode: string,
): Promise<DayAttendance[]> {
  // courseCode format we stored includes classId via the onclick attr
  // Caller must supply classId and slotName extracted from the course list
  // For simplicity, this function receives the raw classId:slotName as courseCode param
  const [classId, slotName] = courseCode.split(':');
  if (!classId || !slotName) return [];

  const html = await vtopPost(
    '/vtop/processViewAttendanceDetail',
    new URLSearchParams({
      _csrf: session.csrfToken,
      authorizedID: session.userId,
      x: Date.now().toString(),
      classId,
      slotName,
    }),
    session,
  );

  const root = parseHtml(html);
  const rows = root.querySelectorAll('table.table tr');
  const byDate = new Map<string, PeriodAttendance[]>();

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]!.querySelectorAll('td');
    if (cols.length < 5) continue;
    const date = cols[1]?.text.trim() ?? '';
    const status = cols[4]?.text.trim() ?? '';
    const dateKey = date;
    const existing = byDate.get(dateKey) ?? [];
    existing.push({ slot: slotName, courseCode, courseTitle: '', status: status as PeriodAttendance['status'] });
    byDate.set(dateKey, existing);
  }

  return [...byDate.entries()].map(([date, periods]) => ({ date, periods }));
}

export async function fetchTimetableData(session: VtopSession): Promise<TimetableEntry[]> {
  const html = await vtopPost(
    '/vtop/processViewTimeTable',
    new URLSearchParams({
      authorizedID: session.userId,
      semesterSubId: session.semesterCode,
      _csrf: session.csrfToken,
      x: Date.now().toString(),
    }),
    session,
  );

  const root = parseHtml(html);
  const entries: TimetableEntry[] = [];

  root.querySelectorAll('tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;

    const slotVenue = cells[7]?.text.trim() ?? '';
    const courseTitle = cells[2]?.text.trim() ?? '';
    const courseCode = slotVenue.startsWith('L')
      ? courseTitle.split(' ')[0] + '(L)'
      : courseTitle.split(' ')[0] + '(T)';

    entries.push({
      slot: slotVenue,
      courseCode,
      courseTitle: courseTitle,
      faculty: cells[8]?.text.trim() ?? '',
      venue: cells[7]?.text.trim() ?? '',
      day: 0,
      periodStart: 0,
    });
  });

  return entries;
}
