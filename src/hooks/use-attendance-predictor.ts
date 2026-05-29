import { useMemo } from 'react';
import type { AttendanceCourse } from '@/types/attendance';

export interface AttendancePrediction {
  courseCode: string;
  currentPercent: number;
  canBunkCount: number;
  needAttendCount: number;
  projectedAt: (extraClasses: number) => number;
}

function predictForTarget(attended: number, total: number, target: number) {
  if (total === 0) return { canBunk: 0, needAttend: 0 };
  const currentPct = attended / total;

  if (currentPct >= target / 100) {
    // Can bunk n classes: (attended / (total + n)) >= target/100
    // attended * 100 >= target * (total + n)
    // n <= (attended * 100 - target * total) / target
    const canBunk = Math.floor((attended * 100 - (target * total)) / target);
    return { canBunk: Math.max(0, canBunk), needAttend: 0 };
  } else {
    // Need to attend n more: (attended + n) / (total + n) >= target/100
    // attended*100 + n*100 >= target*total + target*n
    // n*(100-target) >= target*total - attended*100
    // n >= (target*total - attended*100) / (100-target)
    const needAttend = Math.ceil((target * total - attended * 100) / (100 - target));
    return { canBunk: 0, needAttend: Math.max(0, needAttend) };
  }
}

export function useAttendancePredictor(
  courses: AttendanceCourse[],
  target = 75,
): AttendancePrediction[] {
  return useMemo(
    () =>
      courses.map((course) => {
        const { attended, totalClasses } = course;
        const { canBunk, needAttend } = predictForTarget(attended, totalClasses, target);

        return {
          courseCode: course.courseCode,
          currentPercent: course.percentage,
          canBunkCount: canBunk,
          needAttendCount: needAttend,
          projectedAt: (extra: number) => {
            const n = Math.max(0, extra);
            if (totalClasses + n === 0) return 0;
            const newAttended = attended + n;
            return Math.round((newAttended / (totalClasses + n)) * 100);
          },
        };
      }),
    [courses, target],
  );
}
