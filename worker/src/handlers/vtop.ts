import type { Context } from 'hono';

const VTOP_BASE = 'https://vtopcc.vit.ac.in';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

type Session = { cookies: string; csrfToken: string; semesterCode: string; userId: string };

function mergeCookies(existing: string, setCookie: string | null): string {
  const map = new Map<string, string>();
  for (const part of (existing + '; ' + (setCookie ?? '')).split(/;\s*|,(?=[^ ])/)) {
    const kv = part.split(';')[0]?.trim();
    if (!kv) continue;
    const [k, ...rest] = kv.split('=');
    if (k?.trim()) map.set(k.trim(), rest.join('=').trim());
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractCsrf(html: string): string {
  return html.match(/name="_csrf"\s+value="([^"]+)"/)?.[1] ?? '';
}

async function vtopPost(path: string, session: Session, body: Record<string, string>): Promise<string> {
  const res = await fetch(`${VTOP_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: session.cookies, 'User-Agent': UA },
    body: new URLSearchParams({ ...body, _csrf: session.csrfToken }).toString(),
  });
  return res.text();
}

// Step 1: prelogin — returns cookies + csrfToken + captchaBase64 for client to solve
export async function handleVtopPrelogin(c: Context): Promise<Response> {
  try {
    // GET /vtop/prelogin/setup
    const setupRes = await fetch(`${VTOP_BASE}/vtop/prelogin/setup`, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    let cookies = mergeCookies('', setupRes.headers.get('set-cookie'));
    const setupHtml = await setupRes.text();
    const csrf = extractCsrf(setupHtml);
    if (!csrf) return c.json({ error: 'Cannot extract CSRF from VTOP — may be down' }, 503);

    // POST /vtop/prelogin/setup (flag=VTOP)
    const flagRes = await fetch(`${VTOP_BASE}/vtop/prelogin/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies, 'User-Agent': UA },
      body: new URLSearchParams({ _csrf: csrf, flag: 'VTOP' }).toString(),
      redirect: 'follow',
    });
    cookies = mergeCookies(cookies, flagRes.headers.get('set-cookie'));

    // GET /vtop/login
    const loginRes = await fetch(`${VTOP_BASE}/vtop/login`, {
      headers: { Cookie: cookies, 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
    });
    cookies = mergeCookies(cookies, loginRes.headers.get('set-cookie'));
    const loginHtml = await loginRes.text();

    if (loginHtml.includes('gResponse') || loginHtml.includes('g-recaptcha')) {
      return c.json({ error: 'VTOP is using Google reCAPTCHA — cannot auto-solve' }, 503);
    }

    const loginCsrf = extractCsrf(loginHtml) || csrf;

    // Find captcha image src
    const captchaSrcMatch = loginHtml.match(/id="captchaBlock"[\s\S]*?<img[^>]+src="([^"]+)"/i)
      ?? loginHtml.match(/<img[^>]+id="captchaImg"[^>]+src="([^"]+)"/i)
      ?? loginHtml.match(/src="([^"]*captcha[^"]+)"/i);
    const captchaSrc = captchaSrcMatch?.[1] ?? null;

    let captchaBase64 = '';
    if (captchaSrc) {
      const captchaUrl = captchaSrc.startsWith('http') ? captchaSrc : `${VTOP_BASE}${captchaSrc}`;
      const imgRes = await fetch(captchaUrl, { headers: { Cookie: cookies, 'User-Agent': UA } });
      const buf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
      captchaBase64 = 'data:image/jpeg;base64,' + btoa(bin);
    }

    return c.json({ cookies, csrfToken: loginCsrf, captchaBase64 });
  } catch (e) {
    return c.json({ error: String(e) }, 502);
  }
}

// Step 2: login — client already solved captcha, we just POST it
export async function handleVtopLogin(c: Context): Promise<Response> {
  const { credentials, captchaSolution, cookies: clientCookies, csrfToken } =
    await c.req.json<{ credentials: { username: string; password: string }; captchaSolution: string; cookies: string; csrfToken: string }>();

  const loginRes = await fetch(`${VTOP_BASE}/vtop/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: clientCookies, 'User-Agent': UA },
    body: new URLSearchParams({
      _csrf: csrfToken,
      username: credentials.username,
      password: credentials.password,
      captchaStr: captchaSolution,
    }).toString(),
    redirect: 'follow',
  });
  const finalCookies = mergeCookies(clientCookies, loginRes.headers.get('set-cookie'));
  const html = await loginRes.text();

  if (/invalid\s*captcha/i.test(html)) return c.json({ error: 'CAPTCHA_INVALID' }, 422);
  if (/invalid.*?(user|password|login\s*id)/i.test(html)) return c.json({ error: 'Invalid username or password' }, 401);
  if (/expired/i.test(html) && /month/i.test(html)) return c.json({ error: 'VTOP password expired — update at vtopcc.vit.ac.in' }, 401);
  if (!/authorizedidx/i.test(html)) return c.json({ error: 'Login failed — unexpected VTOP response' }, 401);

  const semMatch = html.match(/semesterSubId['":\s]+"?([A-Z0-9_]+)"?/);
  const newCsrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
  const idMatch = html.match(/id="authorizedID"[^>]*value="([^"]+)"/i)
    ?? html.match(/name="authorizedid"\s+value="([^"]+)"/i);

  return c.json({
    cookies: finalCookies,
    csrfToken: newCsrfMatch?.[1] ?? csrfToken,
    semesterCode: semMatch?.[1] ?? '',
    userId: idMatch?.[1] ?? credentials.username,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
  });
}

export async function handleVtopAttendance(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/processViewStudentAttendance', session, { semesterSubId: session.semesterCode });
  return c.json({ html });
}

export async function handleVtopGrades(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/examinations/doStudentMarkView', session, { semesterSubId: session.semesterCode, authorizedID: session.userId });
  return c.json({ html });
}

export async function handleVtopGradesAll(c: Context): Promise<Response> {
  const { session, semesterSubId } = await c.req.json<{ session: Session; semesterSubId: string }>();
  const html = await vtopPost('/vtop/examinations/examGradeView/doStudentGradeView', session, { semesterSubId, authorizedID: session.userId });
  return c.json({ html });
}

export async function handleVtopExam(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  const html = await vtopPost('/vtop/examinations/doSearchExamScheduleForStudent', session, { semesterSubId: session.semesterCode, authorizedID: session.userId });
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
