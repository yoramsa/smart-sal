#!/usr/bin/env node
/**
 * SmartSal — Consolidation des données scrappées en src/products.json
 *
 * Lit les 4 fichiers scripts/data/{chain}.json (générés par fetch-prices.mjs),
 * dédoublonne par code-barres EAN, traduit les noms en français via le
 * dictionnaire scripts/translate-dict.json, catégorise et identifie les
 * marques distributeur.
 *
 * USAGE: npm run build-products  (ou npm run prices pour fetch + build)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const CHAINS = ['RamiLevi', 'OsherAd', 'Yohananof', 'Shufersal'];
const CHAIN_LABELS = {
  RamiLevi: 'Rami Levi',
  OsherAd: 'Osher Ad',
  Yohananof: 'Yohananof',
  Shufersal: 'Shufersal',
};

// Catégories par mots-clés (matché contre le nom hébreu original)
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

function categorize(name_he, manufacturer) {
  const text = (name_he + ' ' + manufacturer).toLowerCase();
  for (const c of CATEGORIES) {
    for (const kw of c.keywords) {
      if (text.includes(kw.toLowerCase())) return c;
    }
  }
  return { cat: '🛒 Autres', emoji: '🛒' };
}

function identifyStoreBrand(manufacturer, name) {
  const text = manufacturer + ' ' + name;
  for (const [chain, indicators] of Object.entries(STORE_BRAND_INDICATORS)) {
    if (indicators.some(ind => text.includes(ind))) return chain;
  }
  return null;
}

function flattenDict(dictObj) {
  const entries = [];
  for (const [section, dict] of Object.entries(dictObj)) {
    if (section.startsWith('_')) continue;
    for (const [he, fr] of Object.entries(dict)) {
      if (he && fr) entries.push([he, fr]);
    }
  }
  // Trier par longueur décroissante pour remplacer les phrases longues d'abord
  return entries.sort((a, b) => b[0].length - a[0].length);
}

function translateHebrew(text, dictEntries) {
  if (!text) return '';
  let result = text;
  for (const [he, fr] of dictEntries) {
    result = result.split(he).join(fr);
  }
  return result.trim().replace(/\s+/g, ' ');
}

async function main() {
  console.log('Lecture du dictionnaire HE→FR…');
  const dictRaw = JSON.parse(await readFile('./scripts/translate-dict.json', 'utf-8'));
  const dict = flattenDict(dictRaw);
  console.log(`  ${dict.length} entrées chargées.\n`);

  const merged = new Map(); // ean -> agrégat

  for (const chain of CHAINS) {
    const path = `./scripts/data/${chain}.json`;
    if (!existsSync(path)) {
      console.warn(`⚠️  ${path} introuvable — lance "npm run fetch" d'abord.`);
      continue;
    }
    const data = JSON.parse(await readFile(path, 'utf-8'));
    console.log(`${chain}: ${data.items.length} produits`);

    for (const it of data.items) {
      if (!it.ean || it.price <= 0) continue;
      let bucket = merged.get(it.ean);
      if (!bucket) {
        bucket = {
          ean: it.ean,
          name_he: it.name,
          manufacturer: it.manufacturer || '',
          unit: it.unit || '',
          qty: it.qty,
          isWeighted: it.isWeighted,
          prices: {},
        };
        merged.set(it.ean, bucket);
      }
      bucket.prices[CHAIN_LABELS[chain]] = it.price;
      // Préférer le nom le plus complet vu sur les chaînes
      if (it.name && it.name.length > bucket.name_he.length) {
        bucket.name_he = it.name;
        if (it.manufacturer) bucket.manufacturer = it.manufacturer;
      }
    }
  }

  console.log(`\nTotal dédoublonné par EAN : ${merged.size} produits.`);

  const filtered = [];
  for (const item of merged.values()) {
    const chainCount = Object.keys(item.prices).length;
    const storeBrand = identifyStoreBrand(item.manufacturer, item.name_he);
    // garder : produits comparables (≥2 enseignes) OU marques distributeur (utiles même sur 1 enseigne)
    if (chainCount < 2 && !storeBrand) continue;

    const cat = categorize(item.name_he, item.manufacturer);
    const translatedName = translateHebrew(item.name_he, dict);

    filtered.push({
      id: `ean_${item.ean}`,
      ean: item.ean,
      name: translatedName,
      name_he: item.name_he,
      manufacturer: item.manufacturer,
      cat: cat.cat,
      emoji: cat.emoji,
      prices: item.prices,
      unit: item.unit || 'unité',
      isStoreBrand: !!storeBrand,
      storeBrandChain: storeBrand,
    });
  }

  console.log(`Filtré : ${filtered.length} produits gardés (≥2 enseignes ou marques distributeur).`);

  // Tri : catégorie puis nom
  filtered.sort((a, b) => {
    if (a.cat !== b.cat) return a.cat.localeCompare(b.cat);
    return a.name.localeCompare(b.name);
  });

  await writeFile('./src/products.json', JSON.stringify(filtered));
  const sizeMb = (JSON.stringify(filtered).length / 1024 / 1024).toFixed(2);
  console.log(`\n✅ src/products.json écrit — ${filtered.length} produits, ${sizeMb} Mo`);

  // Quelques stats
  const byCategoryCount = {};
  const storeBrandsCount = {};
  for (const p of filtered) {
    byCategoryCount[p.cat] = (byCategoryCount[p.cat] || 0) + 1;
    if (p.isStoreBrand) storeBrandsCount[p.storeBrandChain] = (storeBrandsCount[p.storeBrandChain] || 0) + 1;
  }
  console.log('\nProduits par catégorie :');
  for (const [c, n] of Object.entries(byCategoryCount).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${c}: ${n}`);
  }
  console.log('\nMarques distributeur identifiées :');
  for (const [c, n] of Object.entries(storeBrandsCount)) {
    console.log(`  ${c}: ${n} produits`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
