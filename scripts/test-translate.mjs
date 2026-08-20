import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { flattenDict, translateHebrew, hebrewRatio, isMostlyTranslated } from './lib/translate-lib.mjs';

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

const dictRaw = JSON.parse(await readFile('./scripts/translate-dict.json', 'utf-8'));
const dict = flattenDict(dictRaw);

ok('dictionnaire aplati non vide et trié par longueur décroissante', () => {
  assert.ok(dict.length > 100);
  for (let i = 1; i < dict.length; i++) assert.ok(dict[i - 1][0].length >= dict[i][0].length);
});

ok('phrases longues remplacées avant les mots courts', () => {
  const entries = [['שמן זית', 'huile olive'], ['שמן', 'huile']];
  assert.equal(translateHebrew('שמן זית כתית', entries), 'huile olive כתית');
});

ok('hebrewRatio: 0 pour du français pur, 1 pour de l\'hébreu pur', () => {
  assert.equal(hebrewRatio('huile olive'), 0);
  assert.equal(hebrewRatio('שמן זית'), 1);
});

ok('hebrewRatio partiel', () => {
  const r = hebrewRatio('huile זית');
  assert.ok(r > 0 && r < 1);
});

ok('isMostlyTranslated vrai si peu d\'hébreu restant', () => {
  assert.equal(isMostlyTranslated('huile olive'), true);
  assert.equal(isMostlyTranslated('שמן זית כתית'), false);
});

ok('name_he vide → chaîne vide', () => {
  assert.equal(translateHebrew('', dict), '');
});

console.log(`\n${passed} assertions passées.`);
