import type { VtopSession } from '@/types/auth';
import type { CourseGrade, GradeComponent, SemesterResult } from '@/types/grades';
import { VTOP_BASE } from './auth';
import { parseHtml } from '@/lib/html/parser';

const UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

async function vtopPost(path: string, params: URLSearchParams, session: VtopSession): Promise<string> {
  const res = await fetch(`${VTOP_BASE}${path}`, {
    method: 'POST',
    headers: {
      Cookie: session.cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      Referer: `${VTOP_BASE}/vtop/open/page`,
    },
    body: params.toString(),
  });
  return res.text();
}

function gradeToPoints(grade: string): number {
  const map: Record<string, number> = {
    S: 10, 'A+': 9, A: 9, 'B+': 8, B: 8, 'C+': 7, C: 7, D: 6, F: 0, W: 0, N: 0,
  };
  return map[grade] ?? 0;
}

export function parseCurrentGradesHtml(html: string): CourseGrade[] {
  const root = parseHtml(html);
  const courses: CourseGrade[] = [];

  // Select course rows: main table rows with class tableContent and 9+ columns
  const courseRows = root.querySelectorAll('table.customTable > tbody > tr.tableContent');

  courseRows.forEach((courseRow) => {
    const cols = courseRow.querySelectorAll('td');
    if (cols.length < 9) return;

    // Extract credits: try col[4] first, then col[5], default 0
    const creditRaw4 = cols[4]?.text.trim() ?? '';
    const creditRaw5 = cols[5]?.text.trim() ?? '';
    const credits = parseFloat(creditRaw4) || parseFloat(creditRaw5) || 0;

    const course: CourseGrade = {
      courseCode: cols[2]?.text.trim() ?? '',
      courseTitle: cols[3]?.text.trim() ?? '',
      credits,
      grade: '',
      gradePoint: null,
      totalMarks: null,
      components: [],
    };

    // The detail row is the immediate next sibling of the course row
    const detailRow = courseRow.nextElementSibling;
    if (detailRow) {
      // Assessment rows are inside a nested table: table.customTable-level1 > tbody > tr.tableContent-level1
      const assessmentRows = detailRow.querySelectorAll(
        'table.customTable-level1 > tbody > tr.tableContent-level1',
      );

      assessmentRows.forEach((aRow) => {
        const aCols = aRow.querySelectorAll('td');
        // col[1]: title (output), col[2]: maxMark (output), col[5]: scoredMark (output)
        const title = aCols[1]?.querySelector('output')?.text.trim() ?? aCols[1]?.text.trim() ?? '';
        const maxRaw = aCols[2]?.querySelector('output')?.text.trim() ?? aCols[2]?.text.trim() ?? '';
        const scoredRaw = aCols[5]?.querySelector('output')?.text.trim() ?? aCols[5]?.text.trim() ?? '';
        const max = parseFloat(maxRaw);
        if (!title || isNaN(max) || max <= 0) return;
        course.components.push({
          componentName: title,
          maxMark: max,
          markScored: scoredRaw && scoredRaw !== '-' && scoredRaw !== 'AB' ? parseFloat(scoredRaw) : null,
        } satisfies GradeComponent);
      });
    }

    courses.push(course);
  });

  return courses;
}

export async function fetchCurrentGradesData(session: VtopSession): Promise<CourseGrade[]> {
  const html = await vtopPost(
    '/vtop/examinations/doStudentMarkView',
    new URLSearchParams({
      authorizedID: session.userId,
      semesterSubId: session.semesterCode,
      _csrf: session.csrfToken,
      x: Date.now().toString(),
    }),
    session,
  );
  return parseCurrentGradesHtml(html);
}

export function parseGradeViewHtml(html: string, semId: string): SemesterResult | null {
  const root = parseHtml(html);
  const courses: CourseGrade[] = [];
  let sgpa = 0;
  let cgpa = 0;
  let creditsEarned = 0;
  let creditsRegistered = 0;

  root.querySelectorAll('table tbody tr').forEach((row) => {
    const cols = row.querySelectorAll('td');
    if (cols.length < 6) return;

    const txt = row.text.trim();
    const gpaMatch = txt.match(/SGPA[:\s]+([0-9.]+)/i);
    if (gpaMatch) {
      sgpa = parseFloat(gpaMatch[1] ?? '0');
      const cgpaMatch = txt.match(/CGPA[:\s]+([0-9.]+)/i);
      if (cgpaMatch) cgpa = parseFloat(cgpaMatch[1] ?? '0');
      return;
    }

    const code = cols[1]?.text.trim() ?? '';
    const title = cols[2]?.text.trim() ?? '';
    const grade = cols[5]?.text.trim() ?? '';
    const credits = parseFloat(cols[4]?.text.trim() ?? '0');
    if (!code || !grade) return;

    const gradePoint = gradeToPoints(grade);
    if (grade !== 'F' && grade !== 'W' && grade !== 'N') {
      creditsEarned += credits;
    }
    creditsRegistered += credits;

    courses.push({ courseCode: code, courseTitle: title, credits, grade, gradePoint, totalMarks: null, components: [] });
  });

  if (courses.length === 0) return null;

  return {
    semesterCode: semId,
    semesterName: formatSemName(semId),
    sgpa: sgpa || null,
    cgpa: cgpa || null,
    courses,
    creditsEarned,
    creditsRegistered,
    totalCredits: creditsRegistered,
  };
}

function buildSemesterCodes(userId: string): string[] {
  const startYear = parseInt(userId.slice(0, 2), 10) + 2000;
  const currentYear = new Date().getFullYear();
  const codes: string[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const n = ((y + 1) % 100).toString().padStart(2, '0');
    codes.push(`CH${y}${n}01`, `CH${y}${n}07`, `CH${y}${n}05`);
  }
  return codes;
}

export async function fetchAllSemestersData(session: VtopSession): Promise<SemesterResult[]> {
  const semCodes = buildSemesterCodes(session.userId);

  const results = await Promise.all(
    semCodes.map(async (semId): Promise<SemesterResult | null> => {
      try {
        const html = await vtopPost(
          '/vtop/examinations/examGradeView/doStudentGradeView',
          new URLSearchParams({
            authorizedID: session.userId,
            semesterSubId: semId,
            _csrf: session.csrfToken,
            nocache: Date.now().toString(),
          }),
          session,
        );
        return parseGradeViewHtml(html, semId);
      } catch {
        return null;
      }
    }),
  );

  return results.filter((r): r is SemesterResult => r !== null);
}

function formatSemName(code: string): string {
  const match = code.match(/CH(\d{4})(\d{2})(\d{2})/);
  if (!match) return code;
  const [, y1, y2, month] = match;
  const year = `${y1}-${y2}`;
  const season = month === '01' ? 'Winter' : month === '07' ? 'Summer' : 'Fall';
  return `${season} Semester ${year}`;
}
