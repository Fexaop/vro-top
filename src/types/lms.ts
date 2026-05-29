export interface LmsAssignment {
  id: number;
  courseId: number;
  courseName: string;
  title: string;
  dueDate: string | null;
  openedDate: string | null;
  teacher: string;
  completionStatus: 'submitted' | 'not_submitted' | 'graded' | 'unknown';
  url: string;
}

export interface LmsCourse {
  id: number;
  name: string;
  assignments: LmsAssignment[];
}
