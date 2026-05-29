import type { ScraperAdapter } from './adapter';
import type { LmsCredentials, VitolCredentials, VtopCredentials, VtopSession } from '@/types/auth';
import type { AttendanceCourse, DayAttendance, TimetableEntry } from '@/types/attendance';
import type { CalendarEvent } from '@/types/calendar';
import type { ExamSlot } from '@/types/exam';
import type { CourseGrade, SemesterResult } from '@/types/grades';
import type { HostelInfo, LeaveRequest } from '@/types/hostel';
import type { LmsAssignment } from '@/types/lms';
import type { VitolAssignment } from '@/types/vitol';

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

  vtopLogin(creds: VtopCredentials): Promise<VtopSession> {
    return this.post('/vtop/login', { credentials: creds });
  }
  refreshSession(creds: VtopCredentials, old: VtopSession): Promise<VtopSession> {
    return this.post('/vtop/refresh', { credentials: creds, session: old });
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
