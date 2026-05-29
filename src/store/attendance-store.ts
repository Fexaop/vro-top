import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage/zustand-storage';
import type { AttendanceCourse } from '@/types/attendance';

interface AttendanceState {
  courses: AttendanceCourse[];
  lastFetched: number | null;
  setCourses: (courses: AttendanceCourse[]) => void;
  clear: () => void;
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set) => ({
      courses: [],
      lastFetched: null,
      setCourses: (courses) => set({ courses, lastFetched: Date.now() }),
      clear: () => set({ courses: [], lastFetched: null }),
    }),
    {
      name: 'btop-attendance',
      storage: zustandStorage,
    },
  ),
);
