import type { ScraperAdapter } from './adapter';
import type { LmsCredentials, VitolCredentials, VtopCredentials, VtopSession } from '@/types/auth';
import type { AttendanceCourse, DayAttendance, TimetableEntry } from '@/types/attendance';
import type { CalendarEvent } from '@/types/calendar';
import type { ExamSlot } from '@/types/exam';
import type { CourseGrade, SemesterResult } from '@/types/grades';
import type { HostelInfo, LeaveRequest } from '@/types/hostel';
import type { LmsAssignment } from '@/types/lms';
import type { VitolAssignment } from '@/types/vitol';

import { vtopLogin, refreshVtopSession } from './vtop/auth';
import { fetchAttendanceData, fetchDayAttendanceData } from './vtop/attendance';
import { fetchCurrentGradesData, fetchAllSemestersData } from './vtop/grades';
import { fetchExamScheduleData } from './vtop/exam-schedule';
import { fetchAcademicCalendarData } from './vtop/calendar';
import { fetchHostelData, fetchLeaveData } from './vtop/profile';
import { fetchTimetableData } from './vtop/timetable';
import { lmsLogin as doLmsLogin, fetchLmsAssignmentsData } from './lms/auth';
import { vitolLogin as doVitolLogin, fetchVitolAssignmentsData } from './vitol/auth';

export class OnDeviceAdapter implements ScraperAdapter {
  vtopLogin(creds: VtopCredentials): Promise<VtopSession> {
    return vtopLogin(creds);
  }
  refreshSession(creds: VtopCredentials, old: VtopSession): Promise<VtopSession> {
    return refreshVtopSession(creds, old);
  }
  fetchAttendance(session: VtopSession): Promise<AttendanceCourse[]> {
    return fetchAttendanceData(session);
  }
  fetchDayAttendance(session: VtopSession, courseCode: string): Promise<DayAttendance[]> {
    return fetchDayAttendanceData(session, courseCode);
  }
  fetchTimetable(session: VtopSession): Promise<TimetableEntry[]> {
    return fetchTimetableData(session);
  }
  fetchCurrentGrades(session: VtopSession): Promise<CourseGrade[]> {
    return fetchCurrentGradesData(session);
  }
  fetchAllSemesters(session: VtopSession): Promise<SemesterResult[]> {
    return fetchAllSemestersData(session);
  }
  fetchExamSchedule(session: VtopSession): Promise<ExamSlot[]> {
    return fetchExamScheduleData(session);
  }
  fetchAcademicCalendar(session: VtopSession): Promise<CalendarEvent[]> {
    return fetchAcademicCalendarData(session);
  }
  fetchHostelInfo(session: VtopSession): Promise<HostelInfo> {
    return fetchHostelData(session);
  }
  fetchLeaveHistory(session: VtopSession): Promise<LeaveRequest[]> {
    return fetchLeaveData(session);
  }
  lmsLogin(creds: VtopCredentials): Promise<LmsCredentials> {
    return doLmsLogin(creds);
  }
  fetchLmsAssignments(creds: LmsCredentials): Promise<LmsAssignment[]> {
    return fetchLmsAssignmentsData(creds);
  }
  vitolLogin(creds: VtopCredentials): Promise<VitolCredentials> {
    return doVitolLogin(creds);
  }
  fetchVitolAssignments(creds: VitolCredentials): Promise<VitolAssignment[]> {
    return fetchVitolAssignmentsData(creds);
  }
}
