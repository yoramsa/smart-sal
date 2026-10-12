import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { assertConfig, select, rpcCount } from './lib/supabase.mjs';

if (existsSync('.env')) { try { process.loadEnvFile('.env'); } catch {} }

const countArg = process.argv.find(a => a.startsWith('--count='));
const COUNT = countArg ? parseInt(countArg.slice('--count='.length), 10) : 300;
const offsetArg = process.argv.find(a => a.startsWith('--offset='));
const OFFSET = offsetArg ? parseInt(offsetArg.slice('--offset='.length), 10) : 0;

async function main() {
  assertConfig();
  const remaining = await rpcCount('products', 'translated_at=is.null&name_he=not.is.null&ean=like.729*');
  const rows = await select(
    'products',
    `select=ean,name_he,name_fr,manufacturer,category,emoji&translated_at=is.null&name_he=not.is.null&ean=like.729*&order=ean&limit=${COUNT}&offset=${OFFSET}`
  );
  const out = rows.map(r => ({
    ean: r.ean,
    he: r.name_he,
    fr: r.name_fr || '',
    brand: r.manufacturer || '',
    cat: r.category || '',
    emoji: r.emoji || '',
  }));
  await mkdir('translations', { recursive: true });
  await writeFile('translations/todo.json', JSON.stringify({ remaining, items: out }, null, 1), 'utf-8');
  console.log(`Exporté ${out.length} produits (restant total : ${remaining ?? '?'}).`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
