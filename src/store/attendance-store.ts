import { create } from 'zustand';
import type { AttendanceCourse } from '@/types/attendance';

interface AttendanceState {
  courses: AttendanceCourse[];
  lastFetched: number | null;
  setCourses: (courses: AttendanceCourse[]) => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  courses: [],
  lastFetched: null,
  setCourses: (courses) => set({ courses, lastFetched: Date.now() }),
}));
