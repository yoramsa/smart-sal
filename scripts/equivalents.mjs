import { existsSync } from 'node:fs';
import { assertConfig, select, upsert, deleteRow } from './lib/supabase.mjs';

if (existsSync('.env')) { try { process.loadEnvFile('.env'); } catch {} }

function usage() {
  console.log(`Usage:
  node scripts/equivalents.mjs list [group_id]
  node scripts/equivalents.mjs add <group_id> <ean> [label]
  node scripts/equivalents.mjs rm <group_id> <ean>
  node scripts/equivalents.mjs groups`);
}

async function list(groupId) {
  const q = groupId
    ? `group_id=eq.${encodeURIComponent(groupId)}&select=group_id,ean,label&order=group_id,ean`
    : `select=group_id,ean,label&order=group_id,ean`;
  const rows = await select('product_equivalents', q);
  if (!rows.length) { console.log('(vide)'); return; }
  for (const r of rows) console.log(`${r.group_id}\t${r.ean}\t${r.label || ''}`);
}

async function groups() {
  const rows = await select('product_equivalents', 'select=group_id,ean');
  const byGroup = new Map();
  for (const r of rows) byGroup.set(r.group_id, (byGroup.get(r.group_id) || 0) + 1);
  if (!byGroup.size) { console.log('(aucun groupe)'); return; }
  for (const [g, n] of [...byGroup.entries()].sort()) console.log(`${g}\t${n} EAN`);
}

async function add(groupId, ean, label) {
  if (!groupId || !ean) { usage(); process.exit(1); }
  const n = await upsert('product_equivalents', [{ group_id: groupId, ean, label: label || null }], 'group_id,ean');
  console.log(`✓ ${n} équivalence(s) enregistrée(s): ${groupId} ← ${ean}`);
}

async function rm(groupId, ean) {
  if (!groupId || !ean) { usage(); process.exit(1); }
  await deleteRow('product_equivalents', `group_id=eq.${encodeURIComponent(groupId)}&ean=eq.${encodeURIComponent(ean)}`);
  console.log(`✓ supprimé: ${groupId} ← ${ean}`);
}

async function main() {
  assertConfig();
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'list') return list(a);
  if (cmd === 'groups') return groups();
  if (cmd === 'add') return add(a, b, c);
  if (cmd === 'rm') return rm(a, b);
  usage();
  process.exit(cmd ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
