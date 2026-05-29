import type { Context } from 'hono';

const LMS_BASE = 'https://lms.vit.ac.in';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

export async function handleLmsLogin(c: Context): Promise<Response> {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  const res = await fetch(`${LMS_BASE}/login/token.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({ username, password, service: 'moodle_mobile_app' }).toString(),
  });
  const data = await res.json() as { token?: string; userid?: number; error?: string };
  if (data.error || !data.token) return c.json({ error: data.error ?? 'LMS login failed' }, 401);
  return c.json({ token: data.token, userId: data.userid ?? 0 });
}

export async function handleLmsAssignments(c: Context): Promise<Response> {
  const { token, userId } = await c.req.json<{ token: string; userId: number }>();

  const coursesRes = await fetch(
    `${LMS_BASE}/webservice/rest/server.php?wsfunction=core_enrol_get_users_courses&userid=${userId}&wstoken=${token}&moodlewsrestformat=json`,
    { headers: { 'User-Agent': UA } },
  );
  const courses = await coursesRes.json() as Array<{ id: number; fullname: string }>;
  if (!Array.isArray(courses)) return c.json({ error: 'Failed to fetch courses' }, 500);

  const courseIds = courses.map((course, i) => `courseids[${i}]=${course.id}`).join('&');
  const assignRes = await fetch(
    `${LMS_BASE}/webservice/rest/server.php?wsfunction=mod_assign_get_assignments&${courseIds}&wstoken=${token}&moodlewsrestformat=json`,
    { headers: { 'User-Agent': UA } },
  );
  const assignData = await assignRes.json();
  return c.json(assignData);
}
