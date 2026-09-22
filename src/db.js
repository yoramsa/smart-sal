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
  return getJson('stores?is_tracked=eq.true&select=id,chain,name,city,store_id&order=chain');
}

function displayName(row) {
  const fr = (row.name_fr || '').trim();
  if (fr) return fr;
  return (row.name_he || '').trim();
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
  const rows = await getJson(`products?${or}&${select}&limit=${limit}`);
  return rows.map(mapProduct);
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

export async function getPricesForEans(eans) {
  if (!dbReady || eans.length === 0) return {};
  const list = eans.map((e) => `"${e}"`).join(',');
  const select = 'select=ean,price,unit_price,is_promo,collected_at,stores!inner(chain,is_tracked)';
  const rows = await getJson(`prices?ean=in.(${list})&stores.is_tracked=eq.true&${select}`);
  const byEan = {};
  for (const r of rows) {
    const chain = r.stores?.chain;
    if (!chain) continue;
    if (!byEan[r.ean]) byEan[r.ean] = { prices: {}, unitPrices: {}, promo: {}, collectedAt: {} };
    const cur = byEan[r.ean].prices[chain];
    if (cur == null || r.price < cur) {
      byEan[r.ean].prices[chain] = r.price;
      if (r.unit_price != null) byEan[r.ean].unitPrices[chain] = r.unit_price;
      byEan[r.ean].promo[chain] = Boolean(r.is_promo);
      byEan[r.ean].collectedAt[chain] = r.collected_at;
    }
  }
  return byEan;
}

export async function attachPrices(products) {
  const eans = products.map((p) => p.ean).filter(Boolean);
  const priced = await getPricesForEans(eans);
  return products.map((p) => {
    const entry = priced[p.ean];
    if (!entry) return p;
    return { ...p, prices: entry.prices, unitPrices: entry.unitPrices, promo: entry.promo, collectedAt: entry.collectedAt };
  });
}
