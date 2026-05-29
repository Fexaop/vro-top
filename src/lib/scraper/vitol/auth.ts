import type { VitolCredentials, VtopCredentials } from '@/types/auth';
import type { VitolAssignment } from '@/types/vitol';
import { parseHtml } from '@/lib/html/parser';

const VITOL_HOSTS = ['https://vitolcc.vit.ac.in', 'https://vitolcc1.vit.ac.in'];
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

function extractCookiesFromHeaders(headers: Headers): string {
  return headers.get('set-cookie')?.split(/\n|,(?=[^ ])/).map((c) => c.split(';')[0]?.trim()).filter(Boolean).join('; ') ?? '';
}

export async function vitolLogin(creds: VtopCredentials): Promise<VitolCredentials> {
  let lastError: Error = new Error('All Vitol hosts failed');

  for (const host of VITOL_HOSTS) {
    try {
      // Step 1: GET login page → logintoken + session cookie
      const getRes = await fetch(`${host}/login/index.php`, { headers: { 'User-Agent': UA } });
      const cookies = extractCookiesFromHeaders(getRes.headers);
      const loginHtml = await getRes.text();
      const root = parseHtml(loginHtml);
      const loginToken = root.querySelector('input[name="logintoken"]')?.getAttribute('value') ?? '';

      // Step 2: POST login
      const postRes = await fetch(`${host}/login/index.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies,
          'User-Agent': UA,
        },
        body: new URLSearchParams({
          logintoken: loginToken,
          username: creds.username,
          password: creds.password,
        }).toString(),
        redirect: 'follow',
      });

      const redirectHtml = await postRes.text();
      const sesskeyMatch = redirectHtml.match(/"sesskey":"([^"]+)"/);
      if (!sesskeyMatch?.[1]) throw new Error('Could not extract sesskey from Vitol');

      const finalCookies = extractCookiesFromHeaders(postRes.headers);
      const allCookies = [cookies, finalCookies].filter(Boolean).join('; ');

      return { sessionKey: sesskeyMatch[1], userId: creds.username, host };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError;
}

export async function fetchVitolAssignmentsData(creds: VitolCredentials): Promise<VitolAssignment[]> {
  const { host, sessionKey } = creds;
  const now = new Date();
  const months = [
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), month: (now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2) },
  ];

  const assignments: VitolAssignment[] = [];
  const seen = new Set<string>();

  for (const { year, month } of months) {
    try {
      const body = JSON.stringify([{
        index: 0,
        methodname: 'core_calendar_get_calendar_monthly_view',
        args: { year: String(year), month: String(month), courseid: 1, day: 1, view: 'monthblock' },
      }]);

      const res = await fetch(
        `${host}/lib/ajax/service.php?sesskey=${encodeURIComponent(sessionKey)}&info=core_calendar_get_calendar_monthly_view`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, body },
      );

      const json = (await res.json()) as Array<{ error?: boolean; data?: { weeks?: Array<{ days: Array<{ events?: Array<{ id: number; name: string; url?: string; timestart: number; modulename?: string }> }> }> } }>;
      const data = json[0]?.data;
      if (!data?.weeks) continue;

      for (const week of data.weeks) {
        for (const day of week.days) {
          for (const event of day.events ?? []) {
            if (seen.has(String(event.id))) continue;
            seen.add(String(event.id));

            if (event.modulename !== 'quiz' && event.modulename !== 'assign') continue;

            assignments.push({
              id: String(event.id),
              title: event.name,
              courseName: '',
              dueDate: event.timestart > 0 ? new Date(event.timestart * 1000).toISOString() : null,
              completionStatus: 'pending',
              quizAttempts: 0,
              maxAttempts: 0,
              url: event.url ?? `${host}/mod/${event.modulename}/view.php?id=${event.id}`,
            });
          }
        }
      }
    } catch { /* skip failed month */ }
  }

  return assignments;
}
