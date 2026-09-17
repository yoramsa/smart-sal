import { gunzipSync } from 'node:zlib';
import { UA } from './http.mjs';
import { parseXml } from './parse.mjs';

export const CHAINS = [
  { name: 'RamiLevi',  label: 'Rami Levi',  portal: 'publishedprices', username: 'RamiLevi',  chainId: '7290058140886' },
  { name: 'OsherAd',   label: 'Osher Ad',   portal: 'publishedprices', username: 'osherad',   chainId: '7290696200003' },
  { name: 'Yohananof', label: 'Yohananof',  portal: 'publishedprices', username: 'yohananof', chainId: '7290803800003' },
  { name: 'Shufersal', label: 'Shufersal',  portal: 'shufersal',                              chainId: '7290027600007' },
];

const PORTAL_BASE = 'https://url.publishedprices.co.il';
const SHUFERSAL_BASE = 'https://prices.shufersal.co.il';
const SHUFERSAL_CAT = { PriceFull: 2, Price: 1, StoresFull: 5 };

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

function extractCookies(res) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return list.map(c => c.split(';')[0]).join('; ');
}

function mergeCookies(a, b) {
  const map = new Map();
  for (const part of [a, b].filter(Boolean).join('; ').split('; ')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    map.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

const CSRF_PATTERNS = [
  /<meta\s+name="csrftoken"\s+content="([^"]+)"/i,
  /name="_token"\s+value="([^"]+)"/i,
  /<meta\s+name="csrf-token"\s+content="([^"]+)"/i,
];

export async function loginPublishedPrices(username) {
  const res = await fetch(`${PORTAL_BASE}/login`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`GET /login → ${res.status}`);
  const html = await res.text();
  let csrf = null;
  for (const pat of CSRF_PATTERNS) { const m = html.match(pat); if (m) { csrf = m[1]; break; } }
  if (!csrf) throw new Error('Token CSRF introuvable dans /login');
  const cookies0 = extractCookies(res);

  const auth = await fetch(`${PORTAL_BASE}/login/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies0, 'User-Agent': UA, 'X-CSRF-Token': csrf,
      'X-Requested-With': 'XMLHttpRequest', Referer: `${PORTAL_BASE}/login`,
    },
    body: new URLSearchParams({ csrftoken: csrf, _token: csrf, r: '', username, password: '' }).toString(),
    redirect: 'manual',
  });
  if (auth.status !== 302 && auth.status !== 200) throw new Error(`POST /login/user → ${auth.status}`);
  let cookies = mergeCookies(cookies0, extractCookies(auth));

  const home = await fetch(`${PORTAL_BASE}/`, { headers: { Cookie: cookies, 'User-Agent': UA }, redirect: 'follow' });
  cookies = mergeCookies(cookies, extractCookies(home));
  const homeHtml = await home.text();
  if (homeHtml.includes('Client Login')) throw new Error('Session non créée (page Client Login après login)');
  const m = homeHtml.match(/<meta\s+name="csrftoken"\s+content="([^"]+)"/i);
  return { cookies, csrf: m ? m[1] : csrf };
}

export async function listPublishedPricesFiles(session, pattern) {
  const pageSize = 500;
  let start = 0, total = Infinity;
  const names = [];
  while (start < total) {
    const res = await fetch(`${PORTAL_BASE}/file/json/dir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: session.cookies, 'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': session.csrf, 'User-Agent': UA, Referer: `${PORTAL_BASE}/`,
      },
      body: new URLSearchParams({
        sEcho: '1', iColumns: '5', iDisplayStart: String(start), iDisplayLength: String(pageSize),
        mDataProp_0: 'fname', sSearch: pattern, bRegex: 'false',
        iSortCol_0: '3', sSortDir_0: 'desc', iSortingCols: '1', cd: '/',
        csrftoken: session.csrf, _token: session.csrf,
      }).toString(),
    });
    if (!res.ok) throw new Error(`Listing ${res.status}`);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error('Listing renvoie du non-JSON (redirection login ?)'); }
    const rows = json.aaData || [];
    for (const r of rows) { const n = r.fname || r.name || (Array.isArray(r) ? r[0] : null); if (n) names.push(n); }
    total = Number(json.iTotalDisplayRecords ?? json.iTotalRecords ?? rows.length);
    if (rows.length === 0) break;
    start += pageSize;
  }
  return names;
}

export async function downloadPublished(session, filename) {
  const res = await fetch(`${PORTAL_BASE}/file/d/${filename}`, {
    headers: { Cookie: session.cookies, 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Download ${filename} → ${res.status}`);
  return decompress(await res.arrayBuffer(), filename);
}

export async function listShufersalFiles(category) {
  const catID = SHUFERSAL_CAT[category] ?? 0;
  const url = `${SHUFERSAL_BASE}/FileObject/UpdateCategory?catID=${catID}&storeID=0`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Listing Shufersal ${res.status}`);
  const html = await res.text();
  const raw = [...html.matchAll(/href=["']([^"']*\.(?:gz|xml)[^"']*)["']/gi)].map(m => decodeHtmlEntities(m[1]));
  const links = raw.map(l => l.startsWith('http') ? l : `${SHUFERSAL_BASE}${l.startsWith('/') ? '' : '/'}${l}`);
  const filtered = links.filter(l => new RegExp(category, 'i').test(l));
  return (filtered.length ? filtered : links);
}

export async function downloadUrl(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download ${res.status}`);
  return decompress(await res.arrayBuffer(), url);
}

function decompress(arrayBuffer, hint) {
  const buf = Buffer.from(arrayBuffer);
  if (/\.gz(\?|$)/i.test(hint) || (buf[0] === 0x1f && buf[1] === 0x8b)) {
    return gunzipSync(buf).toString('utf-8');
  }
  return buf.toString('utf-8');
}

export async function fetchParsedXml(source) {
  return parseXml(source);
}
