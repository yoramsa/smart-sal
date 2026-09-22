import { existsSync } from 'node:fs';
import {
  CHAINS, loginPublishedPrices, listPublishedPricesFiles,
  downloadPublished, listShufersalFiles, downloadUrl,
} from './lib/portals.mjs';
import {
  parseXml, extractStores, extractItems, parseFileName,
  newestFile, newestFileForStore, categorize, identifyStoreBrand,
} from './lib/parse.mjs';
import { assertConfig, upsert, select, insertReturning, patch } from './lib/supabase.mjs';

if (existsSync('.env')) { try { process.loadEnvFile('.env'); } catch {} }

function parseMode() {
  const arg = process.argv.find(a => a.startsWith('--mode='));
  const mode = (arg ? arg.slice('--mode='.length) : process.env.SYNC_MODE || 'full').trim();
  if (!['stores', 'full', 'delta'].includes(mode)) throw new Error(`Mode inconnu: ${mode}`);
  return mode;
}

function onlyChains() {
  const arg = process.argv.find(a => a.startsWith('--chain='));
  if (!arg) return CHAINS;
  const wanted = arg.slice('--chain='.length).toLowerCase();
  return CHAINS.filter(c => c.name.toLowerCase() === wanted || c.label.toLowerCase() === wanted);
}

async function startRun(mode, chain) {
  return insertReturning('sync_runs', { mode, chain, status: 'running' });
}

async function finishRun(run, body) {
  if (!run) return;
  await patch('sync_runs', `id=eq.${run.id}`, { finished_at: new Date().toISOString(), ...body });
}

function kindAccepted(k, wantKind) {
  if (wantKind === 'StoresFull') return k === 'StoresFull' || k === 'Stores';
  return k === wantKind;
}

async function chainFileSource(chain, session, wantKind) {
  if (chain.portal === 'publishedprices') {
    const term = wantKind === 'StoresFull' ? 'Stores' : (wantKind === 'Price' ? 'Price' : 'PriceFull');
    const names = await listPublishedPricesFiles(session, term);
    const filtered = names.filter(n => kindAccepted(parseFileName(n).kind, wantKind));
    console.log(`  [${chain.label}] listing "${term}": ${names.length} fichiers, ${filtered.length} retenus. Exemples: ${names.slice(0, 5).join(' | ') || '(aucun)'}`);
    return { names: filtered, download: (name) => downloadPublished(session, name) };
  }
  const urls = await listShufersalFiles(wantKind);
  const map = new Map();
  const names = [];
  for (const u of urls) {
    const m = u.match(/([^/?]+\.(?:gz|xml))/i);
    const fname = m ? m[1] : u;
    if (!kindAccepted(parseFileName(fname).kind, wantKind)) continue;
    if (!map.has(fname)) { map.set(fname, u); names.push(fname); }
  }
  console.log(`  [${chain.label}] listing Shufersal: ${urls.length} liens, ${names.length} retenus. Exemples: ${urls.slice(0, 3).map(u => u.replace(/^https?:\/\//, '').slice(0, 90)).join(' | ') || '(aucun)'}`);
  return { names, download: (name) => downloadUrl(map.get(name)) };
}

function buildProductRow(item, chain) {
  const { cat, emoji } = categorize(item.name_he, item.manufacturer);
  const brand = identifyStoreBrand(item.manufacturer, item.name_he);
  return {
    ean: item.ean,
    name_he: item.name_he,
    manufacturer: item.manufacturer,
    unit: item.unit,
    unit_qty: item.unit_qty,
    category: cat,
    emoji,
    is_weighted: item.is_weighted,
    store_brand_chain: brand,
  };
}

async function syncStores(chain) {
  const session = chain.portal === 'publishedprices' ? await loginPublishedPrices(chain.username) : null;
  const src = await chainFileSource(chain, session, 'StoresFull');
  if (src.names.length === 0) throw new Error('Aucun fichier StoresFull listé');
  const file = newestFile(src.names);
  console.log(`  [${chain.label}] StoresFull: ${file}`);
  const parsed = await parseXml(await src.download(file));
  const stores = extractStores(parsed);
  const rows = stores.map(s => ({
    chain: chain.label,
    chain_id: s.chain_id || chain.chainId,
    subchain_id: s.subchain_id,
    store_id: s.store_id,
    name: s.name,
    address: s.address,
    city: s.city,
  }));
  const n = await upsert('stores', rows, 'chain_id,store_id');
  console.log(`  [${chain.label}] ${n} magasins upsertés`);
  return { stores_seen: n };
}

async function syncPrices(chain, mode) {
  const tracked = await select('stores', `chain=eq.${encodeURIComponent(chain.label)}&is_tracked=eq.true&select=id,store_id,chain_id`);
  if (!tracked || tracked.length === 0) {
    return { status: 'skipped', message: 'Aucun magasin is_tracked=true', stores_seen: 0 };
  }
  const session = chain.portal === 'publishedprices' ? await loginPublishedPrices(chain.username) : null;
  const wantKind = mode === 'delta' ? 'Price' : 'PriceFull';

  let prefetched = null;
  if (chain.portal === 'publishedprices') {
    prefetched = await chainFileSource(chain, session, wantKind);
    console.log(`  [${chain.label}] ${prefetched.names.length} fichiers ${wantKind}, ${tracked.length} magasins suivis`);
  } else {
    console.log(`  [${chain.label}] ${tracked.length} magasins suivis (listing par magasin)`);
  }

  async function fileSourceForStore(store) {
    if (chain.portal === 'publishedprices') {
      return { file: newestFileForStore(prefetched.names, store), download: prefetched.download };
    }
    const urls = await listShufersalFiles(wantKind, parseInt(store.store_id, 10) || store.store_id);
    const map = new Map();
    const names = [];
    for (const u of urls) {
      const m = u.match(/([^/?]+\.(?:gz|xml))/i);
      const fname = m ? m[1] : u;
      if (parseFileName(fname).kind !== wantKind) continue;
      if (!map.has(fname)) { map.set(fname, u); names.push(fname); }
    }
    const file = newestFileForStore(names, store) || newestFile(names);
    return { file, download: (name) => downloadUrl(map.get(name)) };
  }

  let productsUp = 0, pricesUp = 0, storesDone = 0;
  const now = new Date().toISOString();
  for (const store of tracked) {
    const { file, download } = await fileSourceForStore(store);
    if (!file) { console.warn(`  [${chain.label}] magasin ${store.store_id}: aucun fichier ${wantKind}`); continue; }
    const items = extractItems(await parseXml(await download(file)));
    if (items.length === 0) continue;
    const productRows = items.map(it => buildProductRow(it, chain));
    productsUp += await upsert('products', productRows, 'ean');
    const priceRows = items.map(it => ({
      ean: it.ean, store_id: store.id, price: it.price,
      unit_price: it.unit_price, is_promo: it.is_promo, collected_at: now,
    }));
    pricesUp += await upsert('prices', priceRows, 'ean,store_id');
    storesDone += 1;
    console.log(`  [${chain.label}] magasin ${store.store_id}: ${items.length} produits (${file})`);
  }
  return { status: 'success', products_upserted: productsUp, prices_upserted: pricesUp, stores_seen: storesDone };
}

export async function main() {
  assertConfig();
  const mode = parseMode();
  const chains = onlyChains();
  console.log(`SmartSal sync — mode=${mode} — ${chains.map(c => c.label).join(', ')}\n`);

  let okCount = 0;
  for (const chain of chains) {
    console.log(`=== ${chain.label} ===`);
    let run = null;
    try {
      run = await startRun(mode, chain.label);
      const result = mode === 'stores' ? await syncStores(chain) : await syncPrices(chain, mode);
      await finishRun(run, { status: result.status || 'success', message: result.message || null, ...result });
      if ((result.status || 'success') === 'success') okCount++;
      console.log(`  [${chain.label}] ✓ ${result.status || 'success'}`);
    } catch (err) {
      console.error(`  [${chain.label}] ❌ ${err.message}`);
      try { await finishRun(run, { status: 'error', message: err.message }); } catch {}
    }
    console.log('');
  }

  console.log(`${okCount}/${chains.length} enseignes synchronisées (mode ${mode}).`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('sync-supabase.mjs');
if (invokedDirectly) {
  main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
}
