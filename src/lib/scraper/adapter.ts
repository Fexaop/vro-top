import type { LmsCredentials, VitolCredentials, VtopCredentials, VtopSession } from '@/types/auth';
import type { AttendanceCourse, DayAttendance, TimetableEntry } from '@/types/attendance';
import type { CalendarEvent } from '@/types/calendar';
import type { ExamSlot } from '@/types/exam';
import type { CourseGrade, SemesterResult } from '@/types/grades';
import type { HostelInfo, LeaveRequest } from '@/types/hostel';
import type { LmsAssignment } from '@/types/lms';
import type { VitolAssignment } from '@/types/vitol';

export interface ScraperAdapter {
  // VTOP auth
  vtopLogin(creds: VtopCredentials): Promise<VtopSession>;
  refreshSession(creds: VtopCredentials, oldSession: VtopSession): Promise<VtopSession>;

  // VTOP data
  fetchAttendance(session: VtopSession): Promise<AttendanceCourse[]>;
  fetchDayAttendance(session: VtopSession, courseCode: string): Promise<DayAttendance[]>;
  fetchTimetable(session: VtopSession): Promise<TimetableEntry[]>;
  fetchCurrentGrades(session: VtopSession): Promise<CourseGrade[]>;
  fetchAllSemesters(session: VtopSession): Promise<SemesterResult[]>;
  fetchExamSchedule(session: VtopSession): Promise<ExamSlot[]>;
  fetchAcademicCalendar(session: VtopSession): Promise<CalendarEvent[]>;
  fetchHostelInfo(session: VtopSession): Promise<HostelInfo>;
  fetchLeaveHistory(session: VtopSession): Promise<LeaveRequest[]>;

  // LMS
  lmsLogin(creds: VtopCredentials): Promise<LmsCredentials>;
  fetchLmsAssignments(creds: LmsCredentials): Promise<LmsAssignment[]>;

  // Vitol
  vitolLogin(creds: VtopCredentials): Promise<VitolCredentials>;
  fetchVitolAssignments(creds: VitolCredentials): Promise<VitolAssignment[]>;
}
