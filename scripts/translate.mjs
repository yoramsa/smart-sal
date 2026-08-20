import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { assertConfig, select, upsert, rpcCount } from './lib/supabase.mjs';
import { flattenDict, translateHebrew, isMostlyTranslated } from './lib/translate-lib.mjs';

if (existsSync('.env')) { try { process.loadEnvFile('.env'); } catch {} }

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const useLLM = process.argv.includes('--llm');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : Infinity;

async function fetchUntranslated(pageSize = 1000) {
  const out = [];
  let offset = 0;
  while (out.length < LIMIT) {
    const rows = await select(
      'products',
      `select=ean,name_he&translated_at=is.null&name_he=not.is.null&order=ean&limit=${pageSize}&offset=${offset}`
    );
    if (!rows.length) break;
    out.push(...rows);
    offset += pageSize;
    if (rows.length < pageSize) break;
  }
  return LIMIT === Infinity ? out : out.slice(0, LIMIT);
}

function nowIso() { return new Date().toISOString(); }

async function llmTranslateBatch(items) {
  const system = 'Tu es un traducteur hébreu → français pour des noms de produits de supermarché israélien. Réponds UNIQUEMENT par un tableau JSON [{"ean":"...","fr":"..."}], une entrée par produit reçu, traduction courte et naturelle du nom, sans commentaire.';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content: JSON.stringify(items.map(i => ({ ean: i.ean, he: i.name_he }))) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error('Réponse LLM sans tableau JSON');
  return JSON.parse(text.slice(start, end + 1));
}

async function main() {
  assertConfig();
  console.log('Lecture du dictionnaire HE→FR…');
  const dictRaw = JSON.parse(await readFile('./scripts/translate-dict.json', 'utf-8'));
  const dict = flattenDict(dictRaw);
  console.log(`  ${dict.length} entrées.`);

  const totalRemaining = await rpcCount('products', 'translated_at=is.null&name_he=not.is.null');
  console.log(`\nEAN restant à traduire (translated_at IS NULL) : ${totalRemaining ?? '?'}`);

  const rows = await fetchUntranslated();
  console.log(`Chargés pour ce passage : ${rows.length}`);

  const dictResolved = [];
  const stillHebrew = [];
  for (const r of rows) {
    const fr = translateHebrew(r.name_he, dict);
    if (isMostlyTranslated(fr)) dictResolved.push({ ean: r.ean, name_fr: fr, translated_at: nowIso() });
    else stillHebrew.push(r);
  }

  console.log(`\nPasse dictionnaire : ${dictResolved.length} résolus, ${stillHebrew.length} encore majoritairement en hébreu.`);
  if (dictResolved.length > 0) {
    await upsert('products', dictResolved, 'ean');
    console.log(`  ✓ ${dictResolved.length} name_fr écrits via dictionnaire.`);
  }

  console.log(`\nRestant nécessitant le LLM : ${stillHebrew.length}`);
  if (!useLLM) {
    console.log('LLM non lancé (ajoute --llm pour traduire le reste par lots via l\'API).');
    if (!ANTHROPIC_KEY) console.log('Note : ANTHROPIC_API_KEY absent — requis pour --llm.');
    console.log(`Modèle qui serait utilisé : ${MODEL} (surchargeable via ANTHROPIC_MODEL).`);
    return;
  }
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY requis pour --llm.');

  const BATCH = 40;
  let done = 0;
  for (let i = 0; i < stillHebrew.length; i += BATCH) {
    const batch = stillHebrew.slice(i, i + BATCH);
    try {
      const translations = await llmTranslateBatch(batch);
      const byEan = new Map(translations.map(t => [String(t.ean), t.fr]));
      const rows = batch
        .map(b => ({ ean: b.ean, name_fr: byEan.get(String(b.ean)) || null, translated_at: nowIso() }))
        .filter(r => r.name_fr);
      if (rows.length) await upsert('products', rows, 'ean');
      done += rows.length;
      console.log(`  lot ${i / BATCH + 1} : ${rows.length}/${batch.length} traduits (cumul ${done})`);
    } catch (err) {
      console.error(`  lot ${i / BATCH + 1} échoué : ${err.message}`);
    }
  }
  console.log(`\n✓ LLM : ${done} name_fr écrits (modèle ${MODEL}).`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
