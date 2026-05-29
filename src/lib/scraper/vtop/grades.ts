import type { VtopSession } from '@/types/auth';
import type { CourseGrade, SemesterResult } from '@/types/grades';

export async function fetchCurrentGradesData(_session: VtopSession): Promise<CourseGrade[]> {
  // TODO Phase 4
  throw new Error('fetchCurrentGradesData not yet implemented');
}

export async function fetchAllSemestersData(_session: VtopSession): Promise<SemesterResult[]> {
  // TODO Phase 4
  throw new Error('fetchAllSemestersData not yet implemented');
}
