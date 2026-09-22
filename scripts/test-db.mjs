const URL = 'https://wdjrcoyopoytokqjpqca.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkanJjb3lvcG95dG9rcWpwcWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjYyNDEsImV4cCI6MjEwMjYwMjI0MX0.okYYjQopxb0SAVETN1Cs_Kx_lI42XKywlIwDruomOV4';

function headers() { return { apikey: ANON, Authorization: `Bearer ${ANON}` }; }
async function q(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: headers() });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

console.log('== stores suivis ==');
console.log(JSON.stringify(await q('stores?is_tracked=eq.true&select=id,chain,name,city&order=chain'), null, 1).slice(0, 800));

console.log('\n== recherche "lait" (ilike name_fr/name_he) ==');
const term = encodeURIComponent('%lait%');
const search = await q(`products?or=(name_fr.ilike.${term},name_he.ilike.${term})&select=ean,name_fr,name_he,category&limit=5`);
console.log('status', search.status, 'trouvés', Array.isArray(search.json) ? search.json.length : search.json);
console.log(JSON.stringify(search.json, null, 1).slice(0, 900));

console.log('\n== recherche hébreu "חלב" ==');
const he = encodeURIComponent('%חלב%');
const searchHe = await q(`products?name_he=ilike.${he}&select=ean,name_fr,name_he&limit=3`);
console.log('status', searchHe.status, 'trouvés', Array.isArray(searchHe.json) ? searchHe.json.length : searchHe.json);

console.log('\n== prix par magasin pour ces EAN (embed stores!inner) ==');
if (Array.isArray(search.json) && search.json.length) {
  const eans = search.json.map(r => `"${r.ean}"`).join(',');
  const prices = await q(`prices?ean=in.(${eans})&stores.is_tracked=eq.true&select=ean,price,unit_price,is_promo,collected_at,stores!inner(chain,is_tracked)`);
  console.log('status', prices.status, 'lignes', Array.isArray(prices.json) ? prices.json.length : prices.json);
  console.log(JSON.stringify(prices.json, null, 1).slice(0, 1200));
}

console.log('\n== défaut (name_fr non nul) ==');
const def = await q('products?name_fr=not.is.null&select=ean,name_fr,category&order=category&limit=3');
console.log('status', def.status, 'trouvés', Array.isArray(def.json) ? def.json.length : def.json);
console.log(JSON.stringify(def.json, null, 1).slice(0, 500));
