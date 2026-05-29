export interface AttendanceCourse {
  courseCode: string;
  courseTitle: string;
  courseType: 'Theory' | 'Lab' | 'Project' | string;
  slot: string;
  faculty: string;
  totalClasses: number;
  attended: number;
  odHours: number;
  percentage: number;
  absentDates: string[];
}

export interface PeriodAttendance {
  slot: string;
  courseCode: string;
  courseTitle: string;
  status: 'Present' | 'Absent' | 'OD' | 'Holiday' | 'Cancelled';
}

export interface DayAttendance {
  date: string;
  periods: PeriodAttendance[];
}

export interface TimetableEntry {
  slot: string;
  courseCode: string;
  courseTitle: string;
  faculty: string;
  venue: string;
  day: number;
  periodStart: number;
}
