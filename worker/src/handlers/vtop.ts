import type { Context } from 'hono';

const VTOP_BASE = 'https://vtopcc.vit.ac.in';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Extract Set-Cookie headers, returning clean name=value pairs only (strip Path, HttpOnly, etc.)
function getCookieArray(headers: Headers): string[] {
  let raw: string[];
  // @ts-ignore — CF Workers non-standard extension
  if (typeof headers.getAll === 'function') raw = headers.getAll('Set-Cookie') as string[];
  else {
    const h = headers.get('set-cookie');
    raw = h ? h.split(/,(?=[^ ])/) : [];
  }
  return raw.map((h) => h.split(';')[0]?.trim() ?? '').filter(Boolean);
}

// Merge cookie arrays, deduplicating by name — later values win (new session replaces old)
function mergeCookies(...arrays: string[][]): string[] {
  const map = new Map<string, string>();
  for (const arr of arrays) {
    for (const c of arr) {
      const eq = c.indexOf('=');
      if (eq > 0) map.set(c.slice(0, eq).trim(), c.slice(eq + 1).trim());
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`);
}

function joinCookies(arr: string[]): string {
  return arr.join('; ');
}

function extractCsrf(html: string): string {
  return html.match(/name="_csrf"\s+value="([^"]+)"/)?.[1]
    ?? html.match(/value="([^"]+)"\s+name="_csrf"/)?.[1]
    ?? '';
}

type Session = { cookies: string; csrfToken: string; semesterCode: string; userId: string; expiresAt: number };

// ─── PRELOGIN ────────────────────────────────────────────────────────────────
// Single attempt per call — client retries by calling /vtop/prelogin again.
// Keeping retries here would exhaust CF Workers' 50 subrequest limit.
export async function handleVtopPrelogin(c: Context): Promise<Response> {
  try {
    // Step 1: GET /vtop/prelogin/setup → session cookie + CSRF
    const setupRes = await fetch(`${VTOP_BASE}/vtop/prelogin/setup`, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    let cookies = getCookieArray(setupRes.headers);
    const setupHtml = await setupRes.text();
    const setupCsrf = extractCsrf(setupHtml);
    if (!setupCsrf) return c.json({ error: 'CSRF not found' }, 422);

    // Step 2: POST /vtop/prelogin/setup flag=VTOP — select the VTOP portal
    await fetch(`${VTOP_BASE}/vtop/prelogin/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: joinCookies(cookies),
        'User-Agent': UA,
      },
      body: new URLSearchParams({ _csrf: setupCsrf, flag: 'VTOP' }).toString(),
      redirect: 'follow',
    });

    // Step 3: GET /vtop/login — use same original setup cookies (mirrors UniCC captcha.ts exactly)
    const loginPageRes = await fetch(`${VTOP_BASE}/vtop/login`, {
      headers: { Cookie: joinCookies(cookies), 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    // UniCC does NOT update cookies here — keeps original setup cookies throughout prelogin
    const loginHtml = await loginPageRes.text();

    // Check for Google reCAPTCHA (cannot auto-solve)
    if (loginHtml.includes('id="gResponse"') || loginHtml.includes("id='gResponse'")) {
      return c.json({ error: 'GRECAPTCHA' }, 422);
    }

    // Prefer CSRF from the login form — it may differ from the setup page CSRF
    const csrf = extractCsrf(loginHtml) || setupCsrf;

    // Extract captcha image src
    const imgSrcMatch = loginHtml.match(/id="captchaBlock"[\s\S]*?<img[^>]+src="([^"]+)"/i)
      ?? loginHtml.match(/<img[^>]+src="([^"]*captcha[^"]*)"[^>]*>/i);
    const imgSrc = imgSrcMatch?.[1];
    if (!imgSrc) return c.json({ error: 'Captcha image source not found' }, 422);

    let captchaBase64: string;
    if (imgSrc.startsWith('data:image')) {
      captchaBase64 = imgSrc;
    } else {
      const captchaUrl = imgSrc.startsWith('http') ? imgSrc : `${VTOP_BASE}${imgSrc}`;
      const imgRes = await fetch(captchaUrl, {
        headers: { Cookie: joinCookies(cookies), 'User-Agent': UA },
      });
      const buf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
      captchaBase64 = 'data:image/jpeg;base64,' + btoa(bin);
    }

    return c.json({ cookies, csrf, captchaBase64 });
  } catch (err) {
    return c.json({ error: String(err) }, 503);
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
export async function handleVtopLogin(c: Context): Promise<Response> {
  try {
    const { credentials, captchaSolution, cookies, csrf } =
      await c.req.json<{ credentials: { username: string; password: string }; captchaSolution: string; cookies: string[]; csrf: string }>();

    const loginRes = await fetch(`${VTOP_BASE}/vtop/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: joinCookies(cookies),
        'User-Agent': UA,
      },
      body: new URLSearchParams({
        _csrf: csrf,
        username: credentials.username,
        password: credentials.password,
        captchaStr: captchaSolution,
      }).toString(),
      redirect: 'manual',
    });

    // Merge login response cookies — new JSESSIONID replaces old one
    let mergedCookies = mergeCookies(cookies, getCookieArray(loginRes.headers));

    // Follow redirect to dashboard (or fall back to /vtop/open/page)
    const location = loginRes.headers.get('location');
    const dashUrl = location
      ? (location.startsWith('http') ? location : `${VTOP_BASE}${location}`)
      : `${VTOP_BASE}/vtop/open/page`;
    const dashRes = await fetch(dashUrl, {
      headers: { Cookie: joinCookies(mergedCookies), 'User-Agent': UA },
      redirect: 'follow',
    });
    mergedCookies = mergeCookies(mergedCookies, getCookieArray(dashRes.headers));
    const dashboardHtml = await dashRes.text();

    if (/invalid\s*captcha/i.test(dashboardHtml)) return c.json({ error: 'CAPTCHA_INVALID' }, 422);
    if (/invalid\s*(user\s*name|login\s*id|user\s*id)\s*\/\s*password/i.test(dashboardHtml)) {
      return c.json({ error: 'Invalid Username / Password' }, 401);
    }
    if (/months/i.test(dashboardHtml)) {
      return c.json({ error: 'VTOP password expired — update at vtopcc.vit.ac.in' }, 401);
    }
    if (!/authorizedidx/i.test(dashboardHtml)) return c.json({ error: 'Login failed — unknown reason' }, 401);

    const newCsrf = dashboardHtml.match(/name="_csrf"\s+value="([^"]+)"/)?.[1]
      ?? dashboardHtml.match(/value="([^"]+)"\s+name="_csrf"/)?.[1] ?? csrf;
    const authorizedID = dashboardHtml.match(/id="authorizedID"\s+[^>]*value="([^"]+)"/i)?.[1]
      ?? dashboardHtml.match(/name="authorizedid"\s+value="([^"]+)"/i)?.[1]
      ?? credentials.username;
    const semMatch = dashboardHtml.match(/semesterSubId['":\s]+"?([A-Z0-9_]+)"?/);

    return c.json({
      cookies: joinCookies(mergedCookies),
      csrfToken: newCsrf,
      userId: authorizedID,
      semesterCode: semMatch?.[1] ?? currentSemesterCode(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
}

// ─── DATA ENDPOINTS ──────────────────────────────────────────────────────────
async function vtopPost(session: Session, path: string, extra: Record<string, string> = {}): Promise<string> {
  const res = await fetch(`${VTOP_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: session.cookies,
      'User-Agent': UA,
      Referer: `${VTOP_BASE}/vtop/open/page`,
    },
    body: new URLSearchParams({ _csrf: session.csrfToken, authorizedID: session.userId, ...extra }).toString(),
  });
  const html = await res.text();
  if (!res.ok) throw new Error(`VTOP ${res.status} at ${path}: ${html.slice(0, 120)}`);
  return html;
}

function wrapHandler(fn: (c: Context) => Promise<Response>): (c: Context) => Promise<Response> {
  return async (c) => {
    try { return await fn(c); }
    catch (err) { return c.json({ error: String(err) }, 500); }
  };
}

export const handleVtopAttendance = wrapHandler(async (c) => {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewStudentAttendance', { semesterSubId: session.semesterCode, x: Date.now().toString() }) });
});

export const handleVtopDayAttendance = wrapHandler(async (c) => {
  const { session, classId, slotName } = await c.req.json<{ session: Session; classId: string; slotName: string }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewAttendanceDetail', { classId, slotName, x: Date.now().toString() }) });
});

export const handleVtopTimetable = wrapHandler(async (c) => {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewTimeTable', { semesterSubId: session.semesterCode }) });
});

export const handleVtopGrades = wrapHandler(async (c) => {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/examinations/doStudentMarkView', { semesterSubId: session.semesterCode, x: Date.now().toString() }) });
});

export const handleVtopGradesAll = wrapHandler(async (c) => {
  const { session, semesterSubId } = await c.req.json<{ session: Session; semesterSubId: string }>();
  return c.json({ html: await vtopPost(session, '/vtop/examinations/examGradeView/doStudentGradeView', { semesterSubId, nocache: Date.now().toString() }) });
});

export const handleVtopExam = wrapHandler(async (c) => {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/examinations/doSearchExamScheduleForStudent', { semesterSubId: session.semesterCode }) });
});

export const handleVtopCalendar = wrapHandler(async (c) => {
  const { session, calDate } = await c.req.json<{ session: Session; calDate: string }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewCalendar', { calDate, semSubId: session.semesterCode }) });
});

export const handleVtopProfile = wrapHandler(async (c) => {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/studentsRecord/StudentProfileAllView') });
});

export const handleVtopLeave = wrapHandler(async (c) => {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/hostels/student/leave/1') });
});

function currentSemesterCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const semYear = month >= 7 ? year : year - 1;
  const nextYear = ((semYear + 1) % 100).toString().padStart(2, '0');
  const semType = month >= 7 ? '01' : '07';
  return `CH${semYear}${nextYear}${semType}`;
}
