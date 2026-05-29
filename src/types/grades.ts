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
  gradePoint: number;
  components: GradeComponent[];
}

export interface SemesterResult {
  semesterCode: string;
  semesterName: string;
  sgpa: number;
  cgpa: number;
  courses: CourseGrade[];
  creditsEarned: number;
  creditsRegistered: number;
}

export interface GradeDistribution {
  grade: string;
  count: number;
}
