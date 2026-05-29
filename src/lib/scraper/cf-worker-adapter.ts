import type { ScraperAdapter } from './adapter';
import type { LmsCredentials, VtopCredentials, VtopSession } from '@/types/auth';
import type { AttendanceCourse, DayAttendance, TimetableEntry } from '@/types/attendance';
import type { CalendarEvent } from '@/types/calendar';
import type { ExamSlot } from '@/types/exam';
import type { CourseGrade, SemesterResult } from '@/types/grades';
import type { HostelInfo, LeaveRequest } from '@/types/hostel';
import type { LmsAssignment } from '@/types/lms';
import { solveCaptcha } from './vtop/captcha';
import { parseAttendanceHtml, parseDayAttendanceHtml, parseTimetableHtml } from './vtop/attendance';
import { parseCurrentGradesHtml, parseGradeViewHtml } from './vtop/grades';
import { parseExamScheduleHtml } from './vtop/exam-schedule';
import { parseCalendarHtml, buildCalDates } from './vtop/calendar';
import { parseHostelHtml, parseLeaveHtml } from './vtop/profile';

const MAX_CAPTCHA_RETRIES = 10;

export class CfWorkerAdapter implements ScraperAdapter {
  constructor(private readonly baseUrl: string) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Worker error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async postRaw(path: string, body: unknown): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async postHtml(path: string, body: unknown): Promise<string> {
    const data = await this.post<{ html: string }>(path, body);
    return data.html;
  }

  async vtopLogin(creds: VtopCredentials): Promise<VtopSession> {
    for (let attempt = 0; attempt < MAX_CAPTCHA_RETRIES; attempt++) {
      // Prelogin: single attempt per call, worker returns 422 for GRECAPTCHA or failures
      const preloginRes = await this.postRaw('/vtop/prelogin', {});
      if (!preloginRes.ok) continue; // GRECAPTCHA or transient failure — retry

      const prelogin = await preloginRes.json() as { cookies: string[]; csrf: string; captchaBase64: string };
      const { solved } = await solveCaptcha(prelogin.captchaBase64);

      const loginRes = await this.postRaw('/vtop/login', {
        credentials: creds,
        captchaSolution: solved,
        cookies: prelogin.cookies,
        csrf: prelogin.csrf,
      });

      if (loginRes.status === 422) continue; // wrong captcha — retry
      if (!loginRes.ok) {
        const data = await loginRes.json() as { error?: string };
        throw new Error(data.error ?? `Worker error ${loginRes.status}`);
      }

      return loginRes.json() as Promise<VtopSession>;
    }
    throw new Error(`Login failed after ${MAX_CAPTCHA_RETRIES} attempts. VTOP may be using Google reCAPTCHA.`);
  }

  refreshSession(creds: VtopCredentials, _old: VtopSession): Promise<VtopSession> {
    return this.vtopLogin(creds);
  }

  async fetchAttendance(session: VtopSession): Promise<AttendanceCourse[]> {
    const html = await this.postHtml('/vtop/attendance', { session });
    return parseAttendanceHtml(html);
  }

  async fetchDayAttendance(session: VtopSession, courseCode: string): Promise<DayAttendance[]> {
    const [classId, slotName] = courseCode.split(':');
    if (!classId || !slotName) return [];
    const html = await this.postHtml('/vtop/attendance/day', { session, classId, slotName });
    return parseDayAttendanceHtml(html, classId, slotName, courseCode);
  }

  async fetchTimetable(session: VtopSession): Promise<TimetableEntry[]> {
    const html = await this.postHtml('/vtop/timetable', { session });
    return parseTimetableHtml(html);
  }

  async fetchCurrentGrades(session: VtopSession): Promise<CourseGrade[]> {
    const html = await this.postHtml('/vtop/grades/current', { session });
    return parseCurrentGradesHtml(html);
  }

  async fetchAllSemesters(session: VtopSession): Promise<SemesterResult[]> {
    // Build all semester codes and fetch in parallel
    const startYear = parseInt(session.userId.slice(0, 2), 10) + 2000;
    const currentYear = new Date().getFullYear();
    const semCodes: string[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      const n = ((y + 1) % 100).toString().padStart(2, '0');
      semCodes.push(`CH${y}${n}01`, `CH${y}${n}07`, `CH${y}${n}05`);
    }

    const results = await Promise.all(
      semCodes.map(async (semId): Promise<SemesterResult | null> => {
        try {
          const html = await this.postHtml('/vtop/grades/all', { session, semesterSubId: semId });
          return parseGradeViewHtml(html, semId);
        } catch {
          return null;
        }
      }),
    );

    return results.filter((r): r is SemesterResult => r !== null);
  }

  async fetchExamSchedule(session: VtopSession): Promise<ExamSlot[]> {
    const html = await this.postHtml('/vtop/exam-schedule', { session });
    return parseExamScheduleHtml(html);
  }

  async fetchAcademicCalendar(session: VtopSession): Promise<CalendarEvent[]> {
    const dates = buildCalDates(session.semesterCode);
    const events: CalendarEvent[] = [];

    await Promise.all(
      dates.map(async (calDate) => {
        try {
          const html = await this.postHtml('/vtop/calendar', { session, calDate });
          events.push(...parseCalendarHtml(html));
        } catch { /* skip failed month */ }
      }),
    );

    return events;
  }

  async fetchHostelInfo(session: VtopSession): Promise<HostelInfo> {
    const html = await this.postHtml('/vtop/hostel', { session });
    return parseHostelHtml(html);
  }

  async fetchLeaveHistory(session: VtopSession): Promise<LeaveRequest[]> {
    const html = await this.postHtml('/vtop/hostel/leave', { session });
    return parseLeaveHtml(html);
  }

  lmsLogin(creds: VtopCredentials): Promise<LmsCredentials> {
    return this.post('/lms/login', { credentials: creds });
  }

  fetchLmsAssignments(creds: LmsCredentials): Promise<LmsAssignment[]> {
    return this.post('/lms/assignments', { credentials: creds });
  }

}
