import type { VtopSession } from '@/types/auth';
import type { CalendarEvent, CalendarEventType } from '@/types/calendar';
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

function buildCalDates(semCode: string): string[] {
  const semMonth = semCode.slice(-2);
  const startYear = parseInt(semCode.slice(2, 6), 10);
  const next = startYear + 1;
  if (semMonth === '01') {
    return [`01-JUL-${startYear}`, `01-AUG-${startYear}`, `01-SEP-${startYear}`, `01-OCT-${startYear}`, `01-NOV-${startYear}`, `01-DEC-${startYear}`];
  }
  if (semMonth === '07') {
    return [`01-DEC-${startYear}`, `01-JAN-${next}`, `01-FEB-${next}`, `01-MAR-${next}`, `01-APR-${next}`, `01-MAY-${next}`];
  }
  return [`01-MAY-${startYear}`, `01-JUN-${startYear}`, `01-JUL-${startYear}`];
}

function classifyEvent(text: string): CalendarEventType {
  const t = text.toLowerCase();
  if (t.includes('instructional')) return 'Instructional';
  if (t.includes('holiday') || t.includes('vacation') || t.includes('diwali') || t.includes('christmas') || t.includes('pongal')) return 'Holiday';
  return 'Other';
}

export async function fetchAcademicCalendarData(session: VtopSession): Promise<CalendarEvent[]> {
  const dates = buildCalDates(session.semesterCode);
  const events: CalendarEvent[] = [];

  await Promise.all(
    dates.map(async (calDate) => {
      try {
        const html = await vtopPost(
          '/vtop/processViewCalendar',
          new URLSearchParams({
            authorizedID: session.userId,
            semSubId: session.semesterCode,
            calDate,
            _csrf: session.csrfToken,
          }),
          session,
        );

        const root = parseHtml(html);
        // Calendar table: each td.calendarDay has data-date and events inside
        root.querySelectorAll('td[data-date]').forEach((cell) => {
          const dateAttr = cell.getAttribute('data-date') ?? '';
          const eventEls = cell.querySelectorAll('.event, span.event, .calendarEvent');
          for (const el of eventEls) {
            const text = el.text.trim();
            if (!text) continue;
            events.push({ date: dateAttr, text, type: classifyEvent(text) });
          }
        });

        // Fallback: look for table rows with date + event text
        root.querySelectorAll('table tr').forEach((row) => {
          const cols = row.querySelectorAll('td');
          if (cols.length >= 3) {
            const dateText = cols[0]?.text.trim() ?? '';
            const eventText = cols[2]?.text.trim() ?? '';
            if (dateText && eventText) {
              events.push({ date: dateText, text: eventText, type: classifyEvent(eventText) });
            }
          }
        });
      } catch { /* skip failed month */ }
    }),
  );

  return events;
}
