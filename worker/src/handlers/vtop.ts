import type { Context } from 'hono';

const VTOP_BASE = 'https://vtopcc.vit.ac.in';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// CF Workers extension: getAll returns each Set-Cookie header separately (not comma-joined)
function getCookieArray(headers: Headers): string[] {
  // @ts-ignore — CF Workers non-standard extension
  if (typeof headers.getAll === 'function') return headers.getAll('Set-Cookie') as string[];
  const raw = headers.get('set-cookie');
  return raw ? raw.split(/,(?=[^ ])/) : [];
}

function joinCookies(arr: string[]): string {
  return arr.join('; ');
}

function extractCsrf(html: string): string {
  // Match exactly what UniCC does: #stdForm input[name=_csrf]
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
    const cookies = getCookieArray(setupRes.headers); // keep as array like UniCC
    const setupHtml = await setupRes.text();
    const csrf = extractCsrf(setupHtml);
    if (!csrf) return c.json({ error: 'CSRF not found' }, 422);

    // Step 2: POST /vtop/prelogin/setup flag=VTOP — using raw cookie array joined
    await fetch(`${VTOP_BASE}/vtop/prelogin/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: joinCookies(cookies),
        'User-Agent': UA,
      },
      body: new URLSearchParams({ _csrf: csrf, flag: 'VTOP' }).toString(),
      redirect: 'follow',
    });
    // UniCC does NOT use cookies from this response — keeps original cookies array

    // Step 3: GET /vtop/login — same cookies from step 1
    const loginRes = await fetch(`${VTOP_BASE}/vtop/login`, {
      headers: { Cookie: joinCookies(cookies), 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    const loginHtml = await loginRes.text();

    // Check captcha type exactly as UniCC: input#gResponse presence
    const isGRecaptcha = loginHtml.includes('id="gResponse"') || loginHtml.includes("id='gResponse'");
    if (isGRecaptcha) return c.json({ error: 'GRECAPTCHA' }, 422);

    // Extract captcha image src — mirror UniCC's cheerio #captchaBlock img
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

    // Return cookies as array (client joins them) + CSRF + captcha image
    return c.json({ cookies, csrf, captchaBase64 });

  } catch (err) {
    return c.json({ error: String(err) }, 503);
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
// Mirrors UniCC's login.ts POST handler exactly.
export async function handleVtopLogin(c: Context): Promise<Response> {
  try {
    const { credentials, captchaSolution, cookies, csrf } =
      await c.req.json<{ credentials: { username: string; password: string }; captchaSolution: string; cookies: string[]; csrf: string }>();

    const cookieHeader = joinCookies(cookies);

    // POST /vtop/login — NO auto-redirect (mirrors Axios maxRedirects:0)
    const loginRes = await fetch(`${VTOP_BASE}/vtop/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader,
        'User-Agent': UA,
      },
      body: new URLSearchParams({
        _csrf: csrf,
        username: credentials.username,
        password: credentials.password,
        captchaStr: captchaSolution,
      }).toString(),
      redirect: 'manual', // exactly like UniCC's maxRedirects: 0
    });

    // Merge login cookies with original cookies (like UniCC)
    const loginCookies = getCookieArray(loginRes.headers);
    const allCookiesArr = [...cookies, ...loginCookies];
    const allCookies = joinCookies(allCookiesArr);

    // Follow redirect manually (UniCC: if 302 → GET location, else GET /vtop/open/page)
    let dashboardHtml: string;
    const location = loginRes.headers.get('location');
    if ((loginRes.status === 302 || loginRes.status === 301) && location) {
      const dashUrl = location.startsWith('http') ? location : `${VTOP_BASE}${location}`;
      const dash = await fetch(dashUrl, { headers: { Cookie: allCookies, 'User-Agent': UA }, redirect: 'follow' });
      dashboardHtml = await dash.text();
    } else {
      const dash = await fetch(`${VTOP_BASE}/vtop/open/page`, { headers: { Cookie: allCookies, 'User-Agent': UA }, redirect: 'follow' });
      dashboardHtml = await dash.text();
    }

    // Check result — exactly UniCC's regex checks
    if (/invalid\s*captcha/i.test(dashboardHtml)) return c.json({ error: 'CAPTCHA_INVALID' }, 422);
    if (/invalid\s*(user\s*name|login\s*id|user\s*id)\s*\/\s*password/i.test(dashboardHtml)) return c.json({ error: 'Invalid Username / Password' }, 401);
    if (/months/i.test(dashboardHtml)) return c.json({ error: 'VTOP password expired — update at vtopcc.vit.ac.in' }, 401);
    if (!/authorizedidx/i.test(dashboardHtml)) return c.json({ error: 'Login failed — unknown reason' }, 401);

    // Extract session values (mirrors UniCC's cheerio $('input[name="_csrf"]').val() etc.)
    const newCsrf = dashboardHtml.match(/name="_csrf"\s+value="([^"]+)"/)?.[1]
      ?? dashboardHtml.match(/value="([^"]+)"\s+name="_csrf"/)?.[1] ?? csrf;
    const authorizedID = dashboardHtml.match(/id="authorizedID"\s+[^>]*value="([^"]+)"/i)?.[1]
      ?? dashboardHtml.match(/name="authorizedid"\s+value="([^"]+)"/i)?.[1]
      ?? credentials.username;
    const semMatch = dashboardHtml.match(/semesterSubId['":\s]+"?([A-Z0-9_]+)"?/);

    return c.json({
      cookies: allCookies,
      csrfToken: newCsrf,
      userId: authorizedID,
      semesterCode: semMatch?.[1] ?? currentSemesterCode(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
}

// ─── DATA ENDPOINTS ──────────────────────────────────────────────────────────
// These proxy VTOP requests and return raw HTML for the app to parse.
async function vtopPost(session: Session, path: string, extra: Record<string, string> = {}): Promise<string> {
  const res = await fetch(`${VTOP_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookies,
      'User-Agent': UA,
      Referer: `${VTOP_BASE}/vtop/open/page`,
    },
    body: new URLSearchParams({ _csrf: session.csrfToken, authorizedID: session.userId, ...extra }).toString(),
  });
  return res.text();
}

export async function handleVtopAttendance(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewStudentAttendance', { semesterSubId: session.semesterCode, x: Date.now().toString() }) });
}

export async function handleVtopDayAttendance(c: Context): Promise<Response> {
  const { session, classId, slotName } = await c.req.json<{ session: Session; classId: string; slotName: string }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewAttendanceDetail', { classId, slotName, x: Date.now().toString() }) });
}

export async function handleVtopTimetable(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewTimeTable', { semesterSubId: session.semesterCode }) });
}

export async function handleVtopGrades(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/examinations/doStudentMarkView', { semesterSubId: session.semesterCode, x: Date.now().toString() }) });
}

export async function handleVtopGradesAll(c: Context): Promise<Response> {
  const { session, semesterSubId } = await c.req.json<{ session: Session; semesterSubId: string }>();
  return c.json({ html: await vtopPost(session, '/vtop/examinations/examGradeView/doStudentGradeView', { semesterSubId, nocache: Date.now().toString() }) });
}

export async function handleVtopExam(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/examinations/doSearchExamScheduleForStudent', { semesterSubId: session.semesterCode }) });
}

export async function handleVtopCalendar(c: Context): Promise<Response> {
  const { session, calDate } = await c.req.json<{ session: Session; calDate: string }>();
  return c.json({ html: await vtopPost(session, '/vtop/processViewCalendar', { calDate, semSubId: session.semesterCode }) });
}

export async function handleVtopProfile(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/studentsRecord/StudentProfileAllView') });
}

export async function handleVtopLeave(c: Context): Promise<Response> {
  const { session } = await c.req.json<{ session: Session }>();
  return c.json({ html: await vtopPost(session, '/vtop/hostels/student/leave/1') });
}

function currentSemesterCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // VIT semester codes: CH{year}{year+1 last 2 digits}{01 for Jan-June, 07 for July-Nov}
  const semYear = month >= 7 ? year : year - 1;
  const nextYear = ((semYear + 1) % 100).toString().padStart(2, '0');
  const semType = month >= 7 ? '07' : '01';
  return `CH${semYear}${nextYear}${semType}`;
}
