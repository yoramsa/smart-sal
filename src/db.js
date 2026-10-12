const DEFAULT_URL = 'https://wdjrcoyopoytokqjpqca.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkanJjb3lvcG95dG9rcWpwcWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjYyNDEsImV4cCI6MjEwMjYwMjI0MX0.okYYjQopxb0SAVETN1Cs_Kx_lI42XKywlIwDruomOV4';

const URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON;

export const dbReady = Boolean(URL && ANON);

function headers() {
  return { apikey: ANON, Authorization: `Bearer ${ANON}` };
}

function rest(path) {
  return `${URL}/rest/v1/${path}`;
}

async function getJson(path) {
  const res = await fetch(rest(path), { headers: headers() });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

export async function getTrackedStores() {
  if (!dbReady) return [];
  return getJson('stores?is_tracked=eq.true&select=id,chain,name,city,address,store_id&order=chain,name');
}

const HE_RANGE = /[֐-׿]/;
const HE_RUN = /[֐-׿]+/g;
const LATIN = /[A-Za-zÀ-ÿ]/;

function countScripts(s) {
  let he = 0, la = 0;
  for (const ch of s) {
    if (HE_RANGE.test(ch)) he += 1;
    else if (LATIN.test(ch)) la += 1;
  }
  return { he, la };
}

function tidyLatin(s) {
  return s
    .replace(HE_RUN, ' ')
    .replace(/["'`]/g, ' ')
    .replace(/([A-Za-zÀ-ÿ])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,%])/g, '$1')
    .trim();
}

function displayName(row) {
  const fr = (row.name_fr || '').trim();
  const he = (row.name_he || '').trim();
  if (fr) {
    const { he: hc, la: lc } = countScripts(fr);
    if (lc >= 2 && lc >= hc) {
      const cleaned = tidyLatin(fr);
      if (cleaned.length >= 2) return cleaned;
    }
  }
  if (he) return he;
  return fr;
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function fieldScore(field, term) {
  const f = norm(field);
  if (!f || !term) return 0;
  if (f === term) return 100;
  const words = f.split(/[^0-9a-z֐-׿]+/).filter(Boolean);
  if (words.includes(term)) return 90;
  if (f.startsWith(term)) return 80;
  if (words.some((w) => w.startsWith(term))) return 70;
  const idx = f.indexOf(term);
  if (idx >= 0) return 28 - Math.min(idx, 20);
  return 0;
}

function scoreProduct(p, term) {
  if (!term) return 0;
  let best = fieldScore(p.name, term);
  best = Math.max(best, fieldScore(p.name_he, term) - 2);
  best = Math.max(best, fieldScore(p.manufacturer, term) - 6);
  return best - Math.min(p.name.length, 40) * 0.05;
}

function mapProduct(row) {
  return {
    id: row.ean,
    ean: row.ean,
    name: displayName(row),
    name_he: row.name_he || '',
    manufacturer: row.manufacturer || '',
    cat: row.category || '🛒 Autres',
    emoji: row.emoji || '🛒',
    unit: row.unit || 'unité',
    isWeighted: Boolean(row.is_weighted),
    prices: {},
    unitPrices: {},
  };
}

function escapeLike(term) {
  return term.replace(/[%_,()]/g, ' ').trim();
}

export async function searchProducts(query, limit = 30) {
  if (!dbReady) return [];
  const term = escapeLike(query);
  if (!term) return [];
  const pattern = encodeURIComponent(`%${term}%`);
  const or = `or=(name_fr.ilike.${pattern},name_he.ilike.${pattern},manufacturer.ilike.${pattern})`;
  const select = 'select=ean,name_fr,name_he,manufacturer,category,emoji,unit,is_weighted';
  const fetchLimit = Math.max(limit * 6, 60);
  const rows = await getJson(`products?${or}&${select}&limit=${fetchLimit}`);
  const mapped = rows.map(mapProduct);
  const normTerm = norm(query);
  return mapped
    .map((p) => ({ p, s: scoreProduct(p, normTerm) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}

export async function getByCategory(cat, limit = 40) {
  if (!dbReady) return [];
  const select = 'select=ean,name_fr,name_he,manufacturer,category,emoji,unit,is_weighted';
  const rows = await getJson(`products?category=eq.${encodeURIComponent(cat)}&${select}&order=name_fr&limit=${limit}`);
  return rows.map(mapProduct);
}

export async function getDefaultProducts(limit = 40) {
  if (!dbReady) return [];
  const select = 'select=ean,name_fr,name_he,manufacturer,category,emoji,unit,is_weighted';
  const rows = await getJson(`products?name_fr=not.is.null&${select}&order=category&limit=${limit}`);
  return rows.map(mapProduct);
}

export async function getPricesForEans(eans, storeIds) {
  if (!dbReady || eans.length === 0) return {};
  const list = eans.map((e) => `"${e}"`).join(',');
  const filter = (storeIds && storeIds.length)
    ? `store_id=in.(${storeIds.join(',')})`
    : 'stores.is_tracked=eq.true';
  const select = 'select=ean,price,unit_price,is_promo,collected_at,stores!inner(chain,name)';
  const rows = await getJson(`prices?ean=in.(${list})&${filter}&${select}`);
  const byEan = {};
  for (const r of rows) {
    const chain = r.stores?.chain;
    if (!chain) continue;
    if (!byEan[r.ean]) byEan[r.ean] = { prices: {}, unitPrices: {}, promo: {}, collectedAt: {}, storeName: {} };
    const cur = byEan[r.ean].prices[chain];
    if (cur == null || r.price < cur) {
      byEan[r.ean].prices[chain] = r.price;
      if (r.unit_price != null) byEan[r.ean].unitPrices[chain] = r.unit_price;
      byEan[r.ean].promo[chain] = Boolean(r.is_promo);
      byEan[r.ean].collectedAt[chain] = r.collected_at;
      byEan[r.ean].storeName[chain] = r.stores?.name || '';
    }
  }
  return byEan;
}

export async function attachPrices(products, storeIds) {
  const eans = products.map((p) => p.ean).filter(Boolean);
  const priced = await getPricesForEans(eans, storeIds);
  return products.map((p) => {
    const entry = priced[p.ean];
    if (!entry) return p;
    return { ...p, prices: entry.prices, unitPrices: entry.unitPrices, promo: entry.promo, collectedAt: entry.collectedAt, storeName: entry.storeName };
  });
}
