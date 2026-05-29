import type { Context } from 'hono';

const VTOP_BASE = 'https://vtopcc.vit.ac.in';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

type Session = { cookies: string; csrfToken: string; semesterCode: string };

function mergeCookies(existing: string, setCookie: string | null): string {
  const map = new Map<string, string>();
  for (const part of existing.split('; ')) {
    const [k, v] = part.split('=');
    if (k) map.set(k.trim(), v ?? '');
  }
  if (setCookie) {
    for (const cookie of setCookie.split(/,(?=[^ ])/)) {
      const pair = cookie.split(';')[0]?.trim();
      if (!pair) continue;
      const [k, v] = pair.split('=');
      if (k) map.set(k.trim(), v ?? '');
    }
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function vtopPost(path: string, session: Session, body: Record<string, string>): Promise<string> {
  const res = await fetch(`${VTOP_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookies,
      'User-Agent': UA,
    },
    body: new URLSearchParams({ ...body, _csrf: session.csrfToken }).toString(),
  });
  return res.text();
}

export async function handleVtopLogin(c: Context): Promise<Response> {
  const { credentials, captchaSolution } = await c.req.json<{ credentials: { username: string; password: string }; captchaSolution: string }>();

  const preLoginRes = await fetch(`${VTOP_BASE}/vtop/prelogin/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({ flag: 'VTOP' }).toString(),
  });
  let cookies = mergeCookies('', preLoginRes.headers.get('set-cookie'));
  const preHtml = await preLoginRes.text();
  const csrfMatch = preHtml.match(/name="_csrf"\s+value="([^"]+)"/);
  const csrfToken = csrfMatch?.[1] ?? '';

  const loginRes = await fetch(`${VTOP_BASE}/vtop/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies, 'User-Agent': UA },
    body: new URLSearchParams({ _csrf: csrfToken, username: credentials.username, password: credentials.password, captchaStr: captchaSolution }).toString(),
    redirect: 'manual',
  });
  cookies = mergeCookies(cookies, loginRes.headers.get('set-cookie'));
  const html = await loginRes.text();

  if (!html.includes('authorizedidx')) {
    return c.json({ error: 'Login failed — check credentials or CAPTCHA' }, 401);
  }

  const idMatch = html.match(/authorizedID\s*=\s*"([^"]+)"/);
  const newCsrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
  const semMatch = html.match(/CH\d{6}_\d{2}/);

  return c.json({
    session: {
      cookies,
      csrfToken: newCsrfMatch?.[1] ?? csrfToken,
      semesterCode: semMatch?.[0] ?? '',
      userId: idMatch?.[1] ?? credentials.username,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    },
  });
}

export async function handleVtopAttendance(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/processViewStudentAttendance', session, { semesterSubId: session.semesterCode });
  return c.json({ html });
}

export async function handleVtopGrades(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/examinations/doStudentMarkView', session, { semesterSubId: session.semesterCode, authorizedID: '' });
  return c.json({ html });
}

export async function handleVtopExam(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/examinations/doSearchExamScheduleForStudent', session, { semesterSubId: session.semesterCode, authorizedID: '' });
  return c.json({ html });
}

export async function handleVtopCalendar(c: Context): Promise<Response> {
  const { session, month, year } = await c.req.json<{ session: Session; month: number; year: number }>();
  const html = await vtopPost('/vtop/processViewCalendar', session, { month: String(month), year: String(year), semesterSubId: session.semesterCode });
  return c.json({ html });
}

export async function handleVtopProfile(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/studentsRecord/StudentProfileAllView', session, {});
  return c.json({ html });
}

export async function handleVtopLeave(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/hostels/student/leave/1', session, {});
  return c.json({ html });
}
