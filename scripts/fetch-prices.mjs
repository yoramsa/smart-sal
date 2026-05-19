#!/usr/bin/env node
/**
 * SmartSal — Téléchargement des prix réels depuis les portails de transparence
 * israéliens (חוק המחירים, loi de transparence 2014).
 *
 * Pour chaque enseigne, télécharge le dernier fichier "PriceFull" (catalogue
 * complet), le décompresse, parse le XML, et sauvegarde un JSON brut dans
 * scripts/data/{chain}.json.
 *
 * Étape suivante : `node scripts/build-products.mjs` qui dédoublonne, traduit
 * et produit src/products.json.
 *
 * USAGE:
 *   npm install               (installe xml2js + iconv-lite)
 *   npm run fetch             (ou npm run prices pour fetch + build)
 *
 * NOTE: les portails peuvent changer de format sans préavis. Si une étape
 * échoue, le message d'erreur indique quel script et quelle ligne. On itèrera.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { parseStringPromise } from 'xml2js';
import { setDefaultResultOrder } from 'node:dns';
import { Agent, setGlobalDispatcher } from 'undici';

// Forcer IPv4 d'abord (sur Windows, IPv6 cassé est une cause classique de "fetch failed")
setDefaultResultOrder('ipv4first');

// Relaxer la validation TLS (les portails IL ont parfois des chaînes de certs incomplètes)
setGlobalDispatcher(new Agent({
  connect: { rejectUnauthorized: false, timeout: 30_000 },
  connectTimeout: 30_000,
  bodyTimeout: 60_000,
  headersTimeout: 60_000,
}));

const CHAINS = [
  { name: 'RamiLevi',  label: 'Rami Levi',  portal: 'publishedprices', username: 'RamiLevi',  chainId: '7290058140886' },
  { name: 'OsherAd',   label: 'Osher Ad',   portal: 'publishedprices', username: 'osherad',   chainId: '7290696200003' },
  { name: 'Yohananof', label: 'Yohananof',  portal: 'publishedprices', username: 'yohananof', chainId: '7290803800003' },
  { name: 'Shufersal', label: 'Shufersal',  portal: 'shufersal',                              chainId: '7290027600007' },
];

const OUT_DIR = './scripts/data';
const PORTAL_BASE = 'https://url.publishedprices.co.il';

// ---------- Helpers ---------------------------------------------------------

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function extractCookies(res) {
  const setCookieList = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.raw?.()['set-cookie'] || [res.headers.get('set-cookie')]).filter(Boolean);
  return setCookieList.map(c => c.split(';')[0]).join('; ');
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

// ---------- publishedprices.co.il (Rami Levi, Osher Ad, Yohananof) ----------

async function loginPublishedPrices(username) {
  console.log(`  [${username}] Récupération du token CSRF…`);
  let res;
  try {
    res = await fetch(`${PORTAL_BASE}/login`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 SmartSal/1.0' },
    });
  } catch (err) {
    console.error(`  [${username}] fetch a échoué.`);
    console.error(`    err.message : ${err.message}`);
    if (err.cause) console.error(`    err.cause   : ${err.cause.code || err.cause.message || JSON.stringify(err.cause)}`);
    throw new Error(`Connexion impossible à ${PORTAL_BASE}. Cause: ${err.cause?.code || err.message}`);
  }
  if (!res.ok) throw new Error(`GET /login → ${res.status}`);
  const html = await res.text();
  // Essais multiples (différentes versions de Cerberus / Laravel)
  const csrfPatterns = [
    /<meta\s+name="csrftoken"\s+content="([^"]+)"/i,        // Cerberus (publishedprices.co.il)
    /name="_token"\s+value="([^"]+)"/i,
    /name='_token'\s+value='([^']+)'/i,
    /<meta\s+name="csrf-token"\s+content="([^"]+)"/i,
    /name="csrf_token"\s+value="([^"]+)"/i,
    /name="csrfmiddlewaretoken"\s+value="([^"]+)"/i,
    /window\.csrf\s*=\s*["']([^"']+)["']/i,
    /XSRF-TOKEN["']?\s*:\s*["']([^"']+)["']/i,
  ];
  let csrf = null;
  for (const pat of csrfPatterns) {
    const m = html.match(pat);
    if (m) { csrf = m[1]; console.log(`  [${username}] CSRF trouvé via : ${pat.source.slice(0, 40)}…`); break; }
  }
  if (!csrf) {
    // Dump HTML pour debug
    const debugFile = `./scripts/data/_publishedprices-login-${username}.html`;
    try {
      const { writeFile, mkdir } = await import('node:fs/promises');
      await mkdir('./scripts/data', { recursive: true });
      await writeFile(debugFile, html);
      console.error(`  [${username}] HTML de la page login sauvé dans ${debugFile}`);
    } catch {}
    console.error(`  [${username}] Extrait du HTML (1500 premiers caractères) :`);
    console.error(html.slice(0, 1500).replace(/\s+/g, ' '));
    throw new Error('Token CSRF introuvable dans /login (voir HTML dumpé)');
  }
  const sessionCookies = extractCookies(res);

  console.log(`  [${username}] POST /login/user…`);
  const auth = await fetch(`${PORTAL_BASE}/login/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionCookies,
      'User-Agent': 'Mozilla/5.0 SmartSal/1.0',
      'X-CSRF-Token': csrf,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${PORTAL_BASE}/login`,
    },
    // Cerberus accepte plusieurs noms de champ ; on envoie tout en double
    body: new URLSearchParams({
      csrftoken: csrf,
      _token: csrf,
      r: '',
      username,
      password: '',
    }).toString(),
    redirect: 'manual',
  });

  console.log(`  [${username}] POST /login/user → status ${auth.status}`);
  // Log le body si suspect (pour repérer page d'erreur déguisée en 200)
  if (auth.status === 200) {
    try {
      const body = await auth.clone().text();
      if (body.length < 100) {
        console.log(`  [${username}] Body court : ${body.slice(0, 200)}`);
      } else if (body.includes('error') || body.includes('Error') || body.includes('שגיאה')) {
        console.warn(`  [${username}] Réponse 200 contient "error" — login peut-être échoué.`);
      }
    } catch {}
  }
  if (auth.status !== 302 && auth.status !== 200) {
    throw new Error(`Login échoué pour ${username} (status ${auth.status})`);
  }
  let finalCookies = mergeCookies(sessionCookies, extractCookies(auth));
  console.log(`  [${username}] Cookies après login : ${finalCookies.slice(0, 80)}${finalCookies.length > 80 ? '…' : ''}`);

  // Après login, GET / pour rafraîchir la session et récupérer le CSRF du dashboard
  console.log(`  [${username}] GET / pour récupérer le CSRF post-login…`);
  const homeRes = await fetch(`${PORTAL_BASE}/`, {
    headers: { Cookie: finalCookies, 'User-Agent': 'Mozilla/5.0 SmartSal/1.0' },
    redirect: 'follow',
  });
  finalCookies = mergeCookies(finalCookies, extractCookies(homeRes));
  const homeHtml = await homeRes.text();
  const newCsrfMatch = homeHtml.match(/<meta\s+name="csrftoken"\s+content="([^"]+)"/i);
  const finalCsrf = newCsrfMatch ? newCsrfMatch[1] : csrf;
  console.log(`  [${username}] Post-login CSRF : ${finalCsrf.slice(0, 20)}…  (page ${homeHtml.length} caractères, ${homeRes.status})`);

  // Petit dump pour voir si on a bien le dashboard ou la page de login
  if (homeHtml.includes('Client Login')) {
    console.warn(`  [${username}] ⚠️  Après "login", on retombe sur la page Client Login → session pas créée !`);
  } else {
    console.log(`  [${username}] ✓ Session active (pas de "Client Login" dans la home page)`);
  }

  return { cookies: finalCookies, csrf: finalCsrf };
}

async function listPublishedPricesFiles({ cookies, csrf }, pattern = 'PriceFull') {
  console.log(`  POST /file/json/dir avec X-CSRF-Token…`);
  const res = await fetch(`${PORTAL_BASE}/file/json/dir`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': csrf,
      'User-Agent': 'Mozilla/5.0 SmartSal/1.0',
      'Referer': `${PORTAL_BASE}/`,
    },
    body: new URLSearchParams({
      sEcho: '1',
      iColumns: '5',
      iDisplayStart: '0',
      iDisplayLength: '500',
      mDataProp_0: 'fname',
      sSearch: pattern,
      bRegex: 'false',
      iSortCol_0: '3',
      sSortDir_0: 'desc',
      iSortingCols: '1',
      cd: '/',
      csrftoken: csrf,
      _token: csrf,
    }).toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`  Listing renvoyé ${res.status} : ${txt.slice(0, 300)}`);
    throw new Error(`Listing échoué : ${res.status}`);
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch {
    console.error(`  Listing renvoie du non-JSON : ${text.slice(0, 300)}`);
    throw new Error('Listing renvoie du HTML (probablement redirection vers login)');
  }
  const rows = json.aaData || [];
  console.log(`  Listing OK : ${rows.length} entrées brutes (iTotalRecords=${json.iTotalRecords}, iTotalDisplayRecords=${json.iTotalDisplayRecords})`);
  if (rows.length === 0 && json.iTotalRecords > 0) {
    console.warn(`  ⚠️  Total non-zéro mais aaData vide — peut-être un filtre incompatible`);
  }
  return rows.map(r => r.fname || r.name || (Array.isArray(r) ? r[0] : null)).filter(Boolean);
}

// ---------- prices.shufersal.co.il ------------------------------------------

async function listShufersalFiles() {
  console.log(`  [Shufersal] Listing des fichiers PriceFull…`);
  // catID=2 = PriceFull, storeID=0 = tous les magasins
  const url = 'https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeID=0';
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SmartSal/1.0' } });
  } catch (err) {
    console.error(`  [Shufersal] fetch a échoué.`);
    console.error(`    err.message : ${err.message}`);
    if (err.cause) console.error(`    err.cause   : ${err.cause.code || err.cause.message || JSON.stringify(err.cause)}`);
    throw err;
  }
  if (!res.ok) throw new Error(`Listing Shufersal échoué : ${res.status}`);
  const html = await res.text();

  // Essais multiples de patterns (les portails changent leur HTML)
  // Shufersal sert les fichiers via Azure Blob Storage avec des SAS signés ;
  // le pattern peut donc inclure pricesprodpublic.blob.core.windows.net
  const patterns = [
    /(https?:\/\/[^\s"'<>]*PriceFull[^\s"'<>]*\.gz[^\s"'<>]*)/gi,
    /(https?:\/\/pricesprodpublic\.blob\.core\.windows\.net[^\s"'<>]+)/gi,
    /href=["']([^"']*PriceFull[^"']*\.gz[^"']*)["']/gi,
    /href=["']([^"']*\.gz[^"']*)["']/gi,
    /(\/FileObject\/[^"'\s<>]+)/gi,
  ];
  let links = [];
  for (const pat of patterns) {
    const found = [...html.matchAll(pat)].map(m => m[1]).filter(Boolean);
    if (found.length > 0) {
      console.log(`  [Shufersal] Pattern qui a matché : ${pat.source.slice(0, 60)}…`);
      links = found
        .map(l => decodeHtmlEntities(l))  // décoder &amp; → & etc.
        .map(l => l.startsWith('http') ? l : `https://prices.shufersal.co.il${l.startsWith('/') ? '' : '/'}${l}`);
      // Filtre : on veut uniquement les PriceFull, pas les Promos
      const priceFullLinks = links.filter(l => /PriceFull/i.test(l));
      if (priceFullLinks.length > 0) {
        links = priceFullLinks;
      }
      break;
    }
  }

  if (links.length === 0) {
    const sample = html.slice(0, 2000).replace(/\s+/g, ' ');
    console.error(`  [Shufersal] Aucun lien trouvé. Extrait du HTML (2000 premiers caractères) :`);
    console.error(sample);
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir('./scripts/data', { recursive: true });
    await writeFile('./scripts/data/_shufersal-debug.html', html);
    console.error(`  [Shufersal] HTML complet sauvegardé dans scripts/data/_shufersal-debug.html`);
    throw new Error('Aucun lien PriceFull trouvé sur Shufersal');
  }

  // Sauvegarde TOUJOURS le HTML pour pouvoir analyser même en cas de succès partiel
  try {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir('./scripts/data', { recursive: true });
    await writeFile('./scripts/data/_shufersal-listing.html', html);
    // Log un échantillon des 3 premiers liens pour voir la structure
    console.log(`  [Shufersal] Premiers liens trouvés :`);
    for (const l of links.slice(0, 3)) console.log(`    ${l}`);
  } catch {}

  return links;
}

// ---------- Téléchargement + décompression + parsing -----------------------

async function downloadAndDecompress(url, cookies) {
  // Log URL complète (utile pour debug)
  console.log(`  Téléchargement (URL complète) : ${url}`);
  const res = await fetch(url, {
    headers: { Cookie: cookies || '', 'User-Agent': 'Mozilla/5.0 SmartSal/1.0' },
  });
  if (!res.ok) {
    console.error(`  Download a renvoyé ${res.status} ${res.statusText}`);
    try {
      const body = await res.text();
      console.error(`  Body (premiers 500 caractères): ${body.slice(0, 500)}`);
    } catch {}
    throw new Error(`Download ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`  Téléchargé : ${(buf.length / 1024 / 1024).toFixed(1)} Mo, décompression…`);
  const xml = gunzipSync(buf).toString('utf-8');
  console.log(`  Décompressé : ${(xml.length / 1024 / 1024).toFixed(1)} Mo de XML`);
  return xml;
}

async function parsePriceFullXml(xml) {
  const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
  const root = parsed.Root || parsed.root || parsed.PriceFull || Object.values(parsed)[0];
  const itemsContainer = root.Items || root.items || root;
  const rawItems = itemsContainer.Item || itemsContainer.item || [];
  const arr = Array.isArray(rawItems) ? rawItems : [rawItems];

  return arr.map(it => ({
    ean: String(it.ItemCode || '').trim(),
    name: String(it.ItemName || '').trim(),
    manufacturer: String(it.ManufacturerName || '').trim(),
    description: String(it.ManufacturerItemDescription || '').trim(),
    unit: String(it.UnitOfMeasure || it.UnitQty || '').trim(),
    qty: parseFloat(it.Quantity) || 1,
    qtyInPackage: parseInt(it.QtyInPackage) || 1,
    price: parseFloat(it.ItemPrice) || 0,
    unitPrice: parseFloat(it.UnitOfMeasurePrice) || 0,
    isWeighted: it.bIsWeighted === '1' || it.bIsWeighted === 1,
    status: parseInt(it.ItemStatus) || 1,
  })).filter(it => it.ean && it.name && it.price > 0 && it.status === 1);
}

// ---------- Pipeline par enseigne ------------------------------------------

/**
 * Parse un nom de fichier PriceFull pour extraire (storeId, date, time)
 * Format type : PriceFull7290058140886-001-001-20260519-043100.gz
 *                          chainId      sub store date     time
 * Retourne { storeId, date } ou null si pas matchable.
 */
function parsePriceFullName(filename) {
  // Cherche PriceFullXXXX-YYY-ZZZ-DATE-TIME (les segments peuvent être à des positions différentes)
  const m = filename.match(/PriceFull\d+[^-]*-(\d+)-(\d+)-(\d{8})[-_](\d{4,6})/);
  if (!m) return null;
  return { subchainId: m[1], storeId: m[2], date: m[3], time: m[4] };
}

/** Choisit le meilleur fichier dans la liste : latest date, store 001 prioritaire */
function pickBestFile(files) {
  if (files.length === 0) return null;
  const parsed = files.map(f => ({ name: f, meta: parsePriceFullName(f) }));
  // Filtre ceux qu'on peut parser
  const ok = parsed.filter(p => p.meta);
  const target = ok.length > 0 ? ok : parsed;

  // Cherche d'abord la date la plus récente
  const latestDate = target.reduce((max, p) => {
    if (!p.meta) return max;
    return p.meta.date > max ? p.meta.date : max;
  }, '');

  // Parmi les fichiers de la date la plus récente, prendre store 001 ou le plus petit
  const sameDate = target.filter(p => !latestDate || (p.meta && p.meta.date === latestDate));
  sameDate.sort((a, b) => {
    if (!a.meta || !b.meta) return 0;
    return (a.meta.storeId || '').localeCompare(b.meta.storeId || '');
  });

  return sameDate[0]?.name || files[0];
}

async function fetchChain(chain) {
  if (chain.portal === 'publishedprices') {
    const session = await loginPublishedPrices(chain.username);
    const files = await listPublishedPricesFiles(session, 'PriceFull');
    if (files.length === 0) throw new Error('Aucun fichier PriceFull listé');
    const best = pickBestFile(files);
    console.log(`  [${chain.label}] Fichier choisi : ${best} (sur ${files.length} disponibles)`);
    const xml = await downloadAndDecompress(`${PORTAL_BASE}/file/d/${best}`, session.cookies);
    return parsePriceFullXml(xml);
  }

  if (chain.portal === 'shufersal') {
    const links = await listShufersalFiles();
    // Pour Shufersal, on filtre sur le nom de fichier (extrait du chemin de l'URL)
    const filenames = links.map(l => {
      const m = l.match(/(PriceFull[^?\/]+\.gz)/i);
      return m ? m[1] : l;
    });
    const bestName = pickBestFile(filenames);
    const best = links.find(l => l.includes(bestName)) || links[0];
    console.log(`  [${chain.label}] Fichier choisi : ${bestName} (sur ${links.length} disponibles)`);
    const xml = await downloadAndDecompress(best, '');
    return parsePriceFullXml(xml);
  }

  throw new Error(`Portal inconnu : ${chain.portal}`);
}

// ---------- Main ------------------------------------------------------------

async function main() {
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  let okCount = 0;
  for (const chain of CHAINS) {
    console.log(`\n=== ${chain.label} ===`);
    try {
      const items = await fetchChain(chain);
      console.log(`  [${chain.label}] ${items.length} produits parsés ✓`);
      const out = {
        chain: chain.label,
        chainId: chain.chainId,
        fetchedAt: new Date().toISOString(),
        count: items.length,
        items,
      };
      const path = `${OUT_DIR}/${chain.name}.json`;
      await writeFile(path, JSON.stringify(out, null, 0)); // compact pour économiser l'espace
      console.log(`  [${chain.label}] Écrit → ${path}`);
      okCount++;
    } catch (err) {
      console.error(`  [${chain.label}] ❌ ${err.message}`);
      console.error(err.stack?.split('\n').slice(0, 4).join('\n'));
    }
  }

  console.log(`\n${okCount}/${CHAINS.length} enseignes téléchargées.`);
  if (okCount === 0) {
    console.error('Aucune enseigne n\'a pu être téléchargée. Vérifie ta connexion et les portails.');
    process.exit(1);
  }
  console.log('Lance maintenant : npm run build-products');
}

main().catch(err => {
  console.error('\nFatal:', err);
  process.exit(1);
});
