export type ExamType = 'FAT' | 'CAT1' | 'CAT2' | 'LAB' | 'PROJECT' | string;
export type ExamSession = 'FN' | 'AN';

export interface ExamSlot {
  courseCode: string;
  courseTitle: string;
  classId: string;
  slot: string;
  examType: ExamType;
  date: string;
  session: ExamSession;
  reportingTime: string;
  examTime: string;
  venue: string;
  seatNumber: string;
}
