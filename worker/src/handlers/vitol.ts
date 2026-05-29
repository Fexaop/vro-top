import type { Context } from 'hono';

const VITOL_HOSTS = ['https://vitolcc.vit.ac.in', 'https://vitolcc1.vit.ac.in'];
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

function extractCookies(headers: Headers): string {
  return headers.get('set-cookie')?.split(/\n|,(?=[^ ])/).map((c) => c.split(';')[0]?.trim()).filter(Boolean).join('; ') ?? '';
}

export async function handleVitolLogin(c: Context): Promise<Response> {
  const body = await c.req.json<{ credentials: { username: string; password: string } } | { username: string; password: string }>();
  const { username, password } = 'credentials' in body ? body.credentials : body;
  let lastError = 'All Vitol hosts failed';

  for (const host of VITOL_HOSTS) {
    try {
      const getRes = await fetch(`${host}/login/index.php`, { headers: { 'User-Agent': UA } });
      const cookies = extractCookies(getRes.headers);
      const html = await getRes.text();
      const tokenMatch = html.match(/name="logintoken" value="([^"]+)"/);
      const loginToken = tokenMatch?.[1] ?? '';

      const postRes = await fetch(`${host}/login/index.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies, 'User-Agent': UA },
        body: new URLSearchParams({ logintoken: loginToken, username, password }).toString(),
        redirect: 'follow',
      });
      const redirectHtml = await postRes.text();
      const sesskeyMatch = redirectHtml.match(/"sesskey":"([^"]+)"/);
      if (!sesskeyMatch?.[1]) throw new Error('Could not extract sesskey');

      return c.json({ sessionKey: sesskeyMatch[1], userId: username, host });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return c.json({ error: lastError }, 503);
}

export async function handleVitolAssignments(c: Context): Promise<Response> {
  const body = await c.req.json<{ credentials: { sessionKey: string; host: string; userId: string } } | { sessionKey: string; host: string; userId: string }>();
  const { sessionKey, host } = 'credentials' in body ? body.credentials : body;
  const now = new Date();
  const months = [
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), month: (now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2) },
  ];

  const results = await Promise.all(months.map(({ year, month }) =>
    fetch(`${host}/lib/ajax/service.php?sesskey=${encodeURIComponent(sessionKey)}&info=core_calendar_get_calendar_monthly_view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify([{ index: 0, methodname: 'core_calendar_get_calendar_monthly_view', args: { year: String(year), month: String(month), courseid: 1, day: 1, view: 'monthblock' } }]),
    }).then((r) => r.json()).catch(() => null),
  ));

  return c.json(results);
}
