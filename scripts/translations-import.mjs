import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { assertConfig, upsert } from './lib/supabase.mjs';

if (existsSync('.env')) { try { process.loadEnvFile('.env'); } catch {} }

const DIR = 'translations/done';

async function main() {
  assertConfig();
  const files = existsSync(DIR) ? (await readdir(DIR)).filter(f => f.endsWith('.json')).sort() : [];
  if (!files.length) { console.log('Aucun fichier dans translations/done.'); return; }
  const now = new Date().toISOString();
  let total = 0;
  for (const f of files) {
    const arr = JSON.parse(await readFile(`${DIR}/${f}`, 'utf-8'));
    const rows = [];
    for (const t of arr) {
      const fr = (t.fr || '').trim();
      if (!t.ean || !fr) continue;
      const row = { ean: String(t.ean), name_fr: fr, translated_at: now };
      if (t.cat) row.category = t.cat;
      if (t.emoji) row.emoji = t.emoji;
      rows.push(row);
    }
    const n = await upsert('products', rows, 'ean');
    total += n;
    console.log(`${f} : ${n} produits écrits.`);
  }
  console.log(`Total : ${total}.`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
