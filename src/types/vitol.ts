export interface VitolAssignment {
  id: string;
  title: string;
  courseName: string;
  dueDate: string | null;
  completionStatus: 'completed' | 'pending' | 'not_started';
  quizAttempts: number;
  maxAttempts: number;
  url: string;
}
