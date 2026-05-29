import type { LmsCredentials, VtopCredentials } from '@/types/auth';
import type { LmsAssignment } from '@/types/lms';
import { parseHtml } from '@/lib/html/parser';

const LMS_BASE = 'https://lms.vit.ac.in';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

export async function lmsLogin(creds: VtopCredentials): Promise<LmsCredentials> {
  const res = await fetch(`${LMS_BASE}/login/token.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({
      username: creds.username,
      password: creds.password,
      service: 'moodle_mobile_app',
    }).toString(),
  });
  const data = (await res.json()) as { token?: string; userid?: number; error?: string };
  if (data.error || !data.token) throw new Error(data.error ?? 'LMS login failed');
  return { token: data.token, userId: data.userid ?? 0 };
}

async function lmsGet(path: string, token: string): Promise<string> {
  const url = `${LMS_BASE}${path}${path.includes('?') ? '&' : '?'}wstoken=${token}&moodlewsrestformat=json`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  return res.text();
}

export async function fetchLmsAssignmentsData(creds: LmsCredentials): Promise<LmsAssignment[]> {
  // Get enrolled courses
  const coursesRaw = await lmsGet(
    `/webservice/rest/server.php?wsfunction=core_enrol_get_users_courses&userid=${creds.userId}`,
    creds.token,
  );
  const courses = JSON.parse(coursesRaw) as Array<{ id: number; fullname: string }>;
  if (!Array.isArray(courses)) return [];

  // Get assignments for all courses
  const courseIds = courses.map((c, i) => `courseids[${i}]=${c.id}`).join('&');
  const assignRaw = await lmsGet(
    `/webservice/rest/server.php?wsfunction=mod_assign_get_assignments&${courseIds}`,
    creds.token,
  );
  const assignData = JSON.parse(assignRaw) as {
    courses?: Array<{
      id: number;
      fullname: string;
      assignments: Array<{ id: number; name: string; duedate: number; allowsubmissionsfromdate: number }>;
    }>;
  };
  if (!assignData.courses) return [];

  const assignments: LmsAssignment[] = [];
  for (const course of assignData.courses) {
    for (const a of course.assignments) {
      assignments.push({
        id: a.id,
        courseId: course.id,
        courseName: course.fullname,
        title: a.name,
        dueDate: a.duedate > 0 ? new Date(a.duedate * 1000).toISOString() : null,
        openedDate: a.allowsubmissionsfromdate > 0
          ? new Date(a.allowsubmissionsfromdate * 1000).toISOString()
          : null,
        teacher: '',
        completionStatus: 'unknown',
        url: `${LMS_BASE}/mod/assign/view.php?id=${a.id}`,
      });
    }
  }

  return assignments.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}
