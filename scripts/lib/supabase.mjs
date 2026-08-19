import './http.mjs';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

export function assertConfig() {
  if (!URL || !KEY) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis (voir .env, jamais committé).');
  }
}

function headers(extra = {}) {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function upsert(table, rows, onConflict, { ignoreDuplicates = false } = {}) {
  if (rows.length === 0) return 0;
  let count = 0;
  for (const batch of chunk(rows, 500)) {
    const resolution = ignoreDuplicates ? 'ignore-duplicates' : 'merge-duplicates';
    const res = await fetch(`${URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers: headers({ Prefer: `resolution=${resolution},return=minimal` }),
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`upsert ${table} → ${res.status} ${(await res.text()).slice(0, 300)}`);
    count += batch.length;
  }
  return count;
}

export async function select(table, query = '') {
  const res = await fetch(`${URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: headers() });
  if (!res.ok) throw new Error(`select ${table} → ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function insertReturning(table, row) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ${table} → ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function patch(table, query, body) {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${table} → ${res.status} ${(await res.text()).slice(0, 300)}`);
}

export async function deleteRow(table, query) {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  });
  if (!res.ok) throw new Error(`delete ${table} → ${res.status} ${(await res.text()).slice(0, 300)}`);
}

export async function rpcCount(table, query = '') {
  const res = await fetch(`${URL}/rest/v1/${table}?${query ? query + '&' : ''}select=*`, {
    method: 'HEAD',
    headers: headers({ Prefer: 'count=exact', Range: '0-0' }),
  });
  const range = res.headers.get('content-range') || '';
  const m = range.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}
