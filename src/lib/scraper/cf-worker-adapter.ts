import type { ScraperAdapter } from './adapter';
import type { LmsCredentials, VitolCredentials, VtopCredentials, VtopSession } from '@/types/auth';
import type { AttendanceCourse, DayAttendance, TimetableEntry } from '@/types/attendance';
import type { CalendarEvent } from '@/types/calendar';
import type { ExamSlot } from '@/types/exam';
import type { CourseGrade, SemesterResult } from '@/types/grades';
import type { HostelInfo, LeaveRequest } from '@/types/hostel';
import type { LmsAssignment } from '@/types/lms';
import type { VitolAssignment } from '@/types/vitol';
import { solveCaptcha } from './vtop/captcha';

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

  async vtopLogin(creds: VtopCredentials): Promise<VtopSession> {
    // Each /vtop/prelogin call is a fresh Worker invocation (separate subrequest budget).
    // The retry loop lives here in the client so the worker stays under CF's 50-subrequest limit.
    for (let attempt = 0; attempt < MAX_CAPTCHA_RETRIES; attempt++) {
      type PreloginResult =
        | { recaptcha: true }
        | { cookies: string; csrfToken: string; captchaBase64: string }
        | { error: string };

      const prelogin = await this.post<PreloginResult>('/vtop/prelogin', {});

      if ('error' in prelogin) throw new Error(prelogin.error);

      // Worker hit reCAPTCHA this round — retry (next invocation gets a fresh VTOP session)
      if ('recaptcha' in prelogin) continue;

      // Solve the image captcha on-device
      const { solved } = await solveCaptcha(prelogin.captchaBase64);

      const res = await this.postRaw('/vtop/login', {
        credentials: creds,
        captchaSolution: solved,
        cookies: prelogin.cookies,
        csrfToken: prelogin.csrfToken,
      });

      if (res.status === 422) continue; // wrong captcha answer — retry
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `Worker error ${res.status}`);
      }

      return res.json() as Promise<VtopSession>;
    }
    throw new Error(`Login failed after ${MAX_CAPTCHA_RETRIES} attempts.`);
  }

  refreshSession(creds: VtopCredentials, _old: VtopSession): Promise<VtopSession> {
    return this.vtopLogin(creds);
  }

  fetchAttendance(session: VtopSession): Promise<AttendanceCourse[]> {
    return this.post('/vtop/attendance', { session });
  }
  fetchDayAttendance(session: VtopSession, courseCode: string): Promise<DayAttendance[]> {
    return this.post('/vtop/attendance/day', { session, courseCode });
  }
  fetchTimetable(session: VtopSession): Promise<TimetableEntry[]> {
    return this.post('/vtop/timetable', { session });
  }
  fetchCurrentGrades(session: VtopSession): Promise<CourseGrade[]> {
    return this.post('/vtop/grades/current', { session });
  }
  fetchAllSemesters(session: VtopSession): Promise<SemesterResult[]> {
    return this.post('/vtop/grades/all', { session });
  }
  fetchExamSchedule(session: VtopSession): Promise<ExamSlot[]> {
    return this.post('/vtop/exam-schedule', { session });
  }
  fetchAcademicCalendar(session: VtopSession): Promise<CalendarEvent[]> {
    return this.post('/vtop/calendar', { session });
  }
  fetchHostelInfo(session: VtopSession): Promise<HostelInfo> {
    return this.post('/vtop/hostel', { session });
  }
  fetchLeaveHistory(session: VtopSession): Promise<LeaveRequest[]> {
    return this.post('/vtop/hostel/leave', { session });
  }
  lmsLogin(creds: VtopCredentials): Promise<LmsCredentials> {
    return this.post('/lms/login', { credentials: creds });
  }
  fetchLmsAssignments(creds: LmsCredentials): Promise<LmsAssignment[]> {
    return this.post('/lms/assignments', { credentials: creds });
  }
  vitolLogin(creds: VtopCredentials): Promise<VitolCredentials> {
    return this.post('/vitol/login', { credentials: creds });
  }
  fetchVitolAssignments(creds: VitolCredentials): Promise<VitolAssignment[]> {
    return this.post('/vitol/assignments', { credentials: creds });
  }
}
