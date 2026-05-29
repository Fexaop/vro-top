import { parse, HTMLElement } from 'node-html-parser';

export function parseHtml(html: string): HTMLElement {
  return parse(html, { lowerCaseTagName: false, comment: false });
}

export function tableToRows(table: HTMLElement): string[][] {
  return table.querySelectorAll('tr').map((row) =>
    row.querySelectorAll('td, th').map((cell) => cell.text.trim()),
  );
}

export function extractCsrfToken(html: string): string | null {
  const root = parseHtml(html);
  const meta = root.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.getAttribute('content') ?? null;
  const input = root.querySelector('input[name="_csrf"]');
  if (input) return input.getAttribute('value') ?? null;
  const match = html.match(/csrfToken['":\s]+"([^"]+)"/);
  return match ? match[1] : null;
}

export function extractCookies(headers: Headers): string {
  const cookies: string[] = [];
  // React Native may merge multiple Set-Cookie headers with commas
  const raw = headers.get('set-cookie');
  if (raw) {
    // Split on ', ' that starts a new cookie name (look for 'Name=' pattern after ', ')
    // Safe heuristic: split on '; ' only within a directive, cookies are separated by '\n' in some impls
    raw.split(/\n|,(?=[^ ])/).forEach((part) => {
      const cookiePart = part.trim().split(';')[0];
      if (cookiePart) cookies.push(cookiePart.trim());
    });
  }
  return cookies.join('; ');
}
