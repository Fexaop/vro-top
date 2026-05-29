export interface GradeComponent {
  componentName: string;
  maxMark: number;
  markScored: number | null;
}

export interface CourseGrade {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  gradePoint: number | null;
  totalMarks: number | null;
  components: GradeComponent[];
}

export interface SemesterResult {
  semesterCode: string;
  semesterName: string;
  sgpa: number | null;
  cgpa: number | null;
  courses: CourseGrade[];
  creditsEarned: number;
  creditsRegistered: number;
  totalCredits: number;
}

export interface GradeDistribution {
  grade: string;
  count: number;
}
