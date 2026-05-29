import type { VtopCredentials, VtopSession } from '@/types/auth';
import { parseHtml, extractCookies } from '@/lib/html/parser';
import { solveCaptcha } from './captcha';

export const VTOP_BASE = 'https://vtopcc.vit.ac.in';

const VTOP_UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CAPTCHA_RETRIES = 10;

function mergeCookies(...parts: string[]): string {
  const map = new Map<string, string>();
  for (const part of parts) {
    for (const cookie of part.split(';').map((c) => c.trim()).filter(Boolean)) {
      const [k, ...rest] = cookie.split('=');
      if (k) map.set(k.trim(), rest.join('=').trim());
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

async function vtopGet(url: string, cookieStr: string): Promise<{ html: string; cookies: string }> {
  const res = await fetch(url, {
    headers: { Cookie: cookieStr, 'User-Agent': VTOP_UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  const newCookies = extractCookies(res.headers);
  return { html: await res.text(), cookies: mergeCookies(cookieStr, newCookies) };
}

async function vtopPost(
  url: string,
  body: URLSearchParams,
  cookieStr: string,
): Promise<{ html: string; cookies: string; status: number }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Cookie: cookieStr,
      'User-Agent': VTOP_UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html',
    },
    body: body.toString(),
    redirect: 'follow',
  });
  const newCookies = extractCookies(res.headers);
  return {
    html: await res.text(),
    cookies: mergeCookies(cookieStr, newCookies),
    status: res.status,
  };
}

function extractFormCsrf(html: string): string | null {
  const root = parseHtml(html);
  return root.querySelector('input[name="_csrf"]')?.getAttribute('value') ?? null;
}

function extractCaptchaSrc(html: string): string | null {
  const root = parseHtml(html);
  // Google reCAPTCHA check — we can only handle DEFAULT captcha
  if (root.querySelector('input#gResponse')) return null;
  return root.querySelector('#captchaBlock img')?.getAttribute('src') ?? null;
}

export async function vtopLogin(creds: VtopCredentials): Promise<VtopSession> {
  for (let attempt = 0; attempt < MAX_CAPTCHA_RETRIES; attempt++) {
    // Step 1: Prelogin setup — get session cookie + CSRF
    const setupRes = await fetch(`${VTOP_BASE}/vtop/prelogin/setup`, {
      headers: { 'User-Agent': VTOP_UA },
      redirect: 'follow',
    });
    let cookies = extractCookies(setupRes.headers);
    const setupHtml = await setupRes.text();

    const csrf = extractFormCsrf(setupHtml);
    if (!csrf) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    // Step 2: Select VTOP portal
    await vtopPost(
      `${VTOP_BASE}/vtop/prelogin/setup`,
      new URLSearchParams({ _csrf: csrf, flag: 'VTOP' }),
      cookies,
    );

    // Step 3: Get login page + captcha
    const { html: loginHtml, cookies: loginCookies } = await vtopGet(
      `${VTOP_BASE}/vtop/login`,
      cookies,
    );
    cookies = loginCookies;

    const captchaSrc = extractCaptchaSrc(loginHtml);
    if (!captchaSrc) {
      // Google CAPTCHA active — can't auto-solve
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    let captchaBase64: string;
    if (captchaSrc.startsWith('data:image')) {
      captchaBase64 = captchaSrc;
    } else {
      const imgRes = await fetch(
        captchaSrc.startsWith('http') ? captchaSrc : `${VTOP_BASE}${captchaSrc}`,
        { headers: { Cookie: cookies, 'User-Agent': VTOP_UA } },
      );
      captchaBase64 =
        'data:image/jpeg;base64,' + arrayBufferToBase64(await imgRes.arrayBuffer());
    }

    // Step 4: Solve CAPTCHA
    const { solved: captchaStr } = await solveCaptcha(captchaBase64);

    // Step 5: Submit login
    const { html: dashboardHtml, cookies: finalCookies } = await vtopPost(
      `${VTOP_BASE}/vtop/login`,
      new URLSearchParams({
        _csrf: csrf,
        username: creds.username,
        password: creds.password,
        captchaStr,
      }),
      cookies,
    );

    // Step 6: Check response
    if (/invalid\s*captcha/i.test(dashboardHtml)) continue;

    if (/invalid\s*(user\s*name|login\s*id|user\s*id)\s*\/\s*password/i.test(dashboardHtml)) {
      throw new Error('Invalid username or password. Please check your VTOP credentials.');
    }

    if (/months/i.test(dashboardHtml) && /expired/i.test(dashboardHtml)) {
      throw new Error(
        'Your VTOP password has expired. Please log in at vtopcc.vit.ac.in and update it.',
      );
    }

    if (!/authorizedidx/i.test(dashboardHtml)) continue;

    // Step 7: Extract authorizedID and fresh CSRF from dashboard
    const root = parseHtml(dashboardHtml);
    const newCsrf =
      root.querySelector('input[name="_csrf"]')?.getAttribute('value') ?? csrf;
    const authorizedID =
      root.querySelector('#authorizedID')?.getAttribute('value') ??
      root.querySelector('input[name="authorizedid"]')?.getAttribute('value') ??
      creds.username;

    // Extract semester code from dashboard (usually in a hidden input or JS variable)
    const semMatch = dashboardHtml.match(/semesterSubId['":\s]+"?([A-Z0-9]+)"?/);
    const semesterCode = semMatch?.[1] ?? '';

    return {
      cookies: finalCookies,
      csrfToken: newCsrf,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      semesterCode,
      userId: authorizedID,
    };
  }

  throw new Error(
    `Login failed after ${MAX_CAPTCHA_RETRIES} attempts. VTOP may be using Google CAPTCHA.`,
  );
}

export async function refreshVtopSession(
  creds: VtopCredentials,
  _old: VtopSession,
): Promise<VtopSession> {
  return vtopLogin(creds);
}
