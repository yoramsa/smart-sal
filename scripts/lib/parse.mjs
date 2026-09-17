import { parseStringPromise } from 'xml2js';

const CATEGORIES = [
  { keywords: ['עגבני','מלפפון','פלפל','גזר','בצל','תפוח אדמה','קישוא','חציל','בננה','תפוח','לימון','אבוקדו','פטרי','חסה','אבטיח','תות','מלון','ענבים','תפוז','אגס','אפרסק','שזיף','דובדבן','אננס','מנגו','קיווי','שום','כרובית','כרוב','ברוקולי','תרד','כוסבר','פטרוזיליה','נענע','בזיליקום','שמיר','סלרי','סלק','צנון'], cat: '🥬 Fruits & Légumes', emoji: '🥬' },
  { keywords: ['לחם','פיתה','חלה','לחמני','בייגלה','קרואסון','בורקס','מאפה','פירורי לחם'], cat: '🍞 Boulangerie', emoji: '🍞' },
  { keywords: ['חלב ','חלב,','ביצים','ביצה','יוגורט','גבינ','קוטג','מוצרל','פטה','שמנת','חמאה','מרגרינה','מעדן','לבן '], cat: '🥛 Crémerie & Œufs', emoji: '🥛' },
  { keywords: ['עוף','שניצל','פילה','חזה','כרעיים','כנפיים','בקר','טחון','בשר','כבש','טלה','הודו','נקניק','פסטרמה','סלמי','דג ','דגים','סלמון','טונה','סרדינים','מקרל'], cat: '🥩 Boucherie & Poisson', emoji: '🥩' },
  { keywords: ['אורז','פסטה','ספגטי','פנה','סוכר','מלח ','קמח','שמן','חומץ','קטשופ','מיונז','חרדל','טחינה','חומוס','עדשים','אפונה','שעועית','תירס','קוסקוס','בורגול','קווקר','דבש','ריבה','ממרח','שוקולד','קקאו','קפה','תה ','אגוזים','שקדים','פיסטוקים','צימוקים','תמרים','פסטו','רוטב','שימורים','פתיתים','קורנפלקס','דגני בוקר','גרנולה'], cat: '🌾 Épicerie sèche', emoji: '🌾' },
  { keywords: ['מים ','מינרליים','מוגזים','מיץ','סודה','קולה','ספרייט','פאנטה','יין','בירה','וודקה','ויסקי','אראק','ערק','שמפניה'], cat: '🥤 Boissons', emoji: '🥤' },
  { keywords: ['במבה','ביסלי','צ\'יפס','פופקורן','עוגיות','עוגייה','וופלים','ופלים','שוקולדים','סוכריות','מסטיק','גלידה','גלידות','אסקימו','קרמבו'], cat: '🍿 Snacks & Sucré', emoji: '🍿' },
  { keywords: ['סבון','שמפו','מרכך','כביסה','אבקת כביסה','מטהר','אקונומיקה','ספוג','נייר טואלט','מגבות','ממחטות','חיתולים','שקיות אשפה','משחת שיניים','מברשת שיניים','דאודורנט'], cat: '🧹 Nettoyage & Hygiène', emoji: '🧹' },
];

const STORE_BRAND_INDICATORS = {
  'Rami Levi':  ['מותג רמי לוי', 'רמי לוי', 'מותג ר.לוי', 'ר. לוי'],
  'Shufersal':  ['Yesh', 'YESH', 'יש ', 'מותג שופרסל', 'שופרסל - מותג'],
  'Osher Ad':   ['מותג אושר עד', 'אושר עד - מותג'],
  'Yohananof':  ['מותג יוחננוף', 'יוחננוף - מותג'],
};

export function categorize(nameHe, manufacturer) {
  const text = ((nameHe || '') + ' ' + (manufacturer || '')).toLowerCase();
  for (const c of CATEGORIES) {
    for (const kw of c.keywords) {
      if (text.includes(kw.toLowerCase())) return { cat: c.cat, emoji: c.emoji };
    }
  }
  return { cat: '🛒 Autres', emoji: '🛒' };
}

export function identifyStoreBrand(manufacturer, name) {
  const text = (manufacturer || '') + ' ' + (name || '');
  for (const [chain, indicators] of Object.entries(STORE_BRAND_INDICATORS)) {
    if (indicators.some(ind => text.includes(ind))) return chain;
  }
  return null;
}

export function isPromoName(raw) {
  return /מבצע/.test(raw || '');
}

export function cleanName(raw) {
  return (raw || '')
    .replace(/מבצע/g, '')
    .replace(/[★☆⭐✦✧✩✪✫✬✭✮✯*]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripZeros(s) {
  const t = String(s || '').replace(/^0+/, '');
  return t === '' ? '0' : t;
}

export function parseFileName(filename) {
  const base = String(filename).split(/[\\/]/).pop().replace(/\.(gz|xml)$/i, '');
  const kindMatch = base.match(/^(PriceFull|PromoFull|StoresFull|Stores|Price|Promo)/i);
  const kind = kindMatch ? kindMatch[1] : null;
  const afterKind = kind ? base.slice(kind.length) : base;
  const chainMatch = afterKind.match(/(\d{5,})/);
  const chainId = chainMatch ? chainMatch[1] : null;
  const tail = chainId ? afterKind.slice(afterKind.indexOf(chainId) + chainId.length) : afterKind;
  const tokens = tail.split(/[-_]/).filter(Boolean);

  let datetime = null, date = null, time = null, storeId = null, subchainId = null;
  const shorts = [];
  for (const tok of tokens) {
    if (/^\d{12,14}$/.test(tok)) { datetime = tok; continue; }
    if (/^\d{8}$/.test(tok)) { date = tok; continue; }
    if (date && !time && /^\d{4,6}$/.test(tok)) { time = tok; continue; }
    if (/^\d{1,4}$/.test(tok)) { shorts.push(tok); continue; }
  }
  if (shorts.length === 1) { storeId = shorts[0]; }
  else if (shorts.length >= 2) { subchainId = shorts[0]; storeId = shorts[1]; }

  if (!date && datetime) { date = datetime.slice(0, 8); time = datetime.slice(8); }
  const sortKey = (date || '') + (time || datetime?.slice(8) || '');

  return { kind, chainId, subchainId, storeId, date, time, sortKey };
}

export function fileMatchesStore(meta, store) {
  if (!meta || !meta.storeId) return false;
  if (stripZeros(meta.storeId) !== stripZeros(store.store_id)) return false;
  if (store.chain_id && meta.chainId && String(meta.chainId) !== String(store.chain_id)) return false;
  return true;
}

export function newestFileForStore(filenames, store) {
  let best = null, bestKey = '';
  for (const f of filenames) {
    const meta = parseFileName(f);
    if (!fileMatchesStore(meta, store)) continue;
    if (meta.sortKey >= bestKey) { bestKey = meta.sortKey; best = f; }
  }
  return best;
}

export function newestFile(filenames) {
  let best = null, bestKey = '';
  for (const f of filenames) {
    const meta = parseFileName(f);
    if (meta.sortKey >= bestKey) { bestKey = meta.sortKey; best = f; }
  }
  return best || filenames[0] || null;
}

function toLowerKeys(node) {
  const out = {};
  for (const k of Object.keys(node)) out[k.toLowerCase()] = node[k];
  return out;
}

function scalar(v) {
  if (v == null) return null;
  if (typeof v === 'object') return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function walkStores(node, ctx, out) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walkStores(n, ctx, out); return; }
  const lower = toLowerKeys(node);
  const nextCtx = { ...ctx };
  if (scalar(lower.chainid)) nextCtx.chainId = scalar(lower.chainid);
  if (scalar(lower.subchainid)) nextCtx.subchainId = scalar(lower.subchainid);
  const sid = scalar(lower.storeid);
  const looksLikeStore = sid != null && (('storename' in lower) || ('address' in lower) || ('city' in lower) || ('storetype' in lower) || ('bikoretno' in lower));
  if (looksLikeStore) {
    out.push({
      chain_id: nextCtx.chainId || null,
      subchain_id: nextCtx.subchainId || null,
      store_id: sid,
      name: scalar(lower.storename),
      address: scalar(lower.address),
      city: scalar(lower.city),
    });
    return;
  }
  for (const k of Object.keys(node)) walkStores(node[k], nextCtx, out);
}

export function extractStores(parsed) {
  const out = [];
  walkStores(parsed, {}, out);
  const seen = new Set();
  const dedup = [];
  for (const s of out) {
    const key = (s.chain_id || '') + ':' + s.store_id;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(s);
  }
  return dedup;
}

function walkItems(node, out) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walkItems(n, out); return; }
  const lower = toLowerKeys(node);
  if ('itemcode' in lower && 'itemprice' in lower) { out.push(lower); return; }
  for (const k of Object.keys(node)) walkItems(node[k], out);
}

export function extractItems(parsed) {
  const raw = [];
  walkItems(parsed, raw);
  const byEan = new Map();
  for (const lower of raw) {
    const ean = scalar(lower.itemcode);
    const rawName = scalar(lower.itemname) || '';
    const price = parseFloat(lower.itemprice);
    const status = lower.itemstatus != null ? parseInt(lower.itemstatus, 10) : 1;
    if (!ean || !rawName || !(price > 0) || status === 0) continue;
    const item = {
      ean,
      name_he: cleanName(rawName),
      manufacturer: scalar(lower.manufacturername) || '',
      unit: scalar(lower.unitofmeasure) || scalar(lower.unitqty) || '',
      unit_qty: parseFloat(lower.quantity) || null,
      price,
      unit_price: parseFloat(lower.unitofmeasureprice) || null,
      is_weighted: lower.bisweighted === '1' || lower.bisweighted === 1,
      is_promo: isPromoName(rawName),
    };
    byEan.set(ean, item);
  }
  return [...byEan.values()];
}

export async function parseXml(xml) {
  return parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
}
