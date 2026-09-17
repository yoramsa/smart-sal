import assert from 'node:assert';
import { compareBasket, splitWeighted, applyEquivalents } from '../src/compare.js';

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

const CHAINS = ['Rami Levi', 'Osher Ad', 'Shufersal', 'Yohananof'];

function item(id, prices, extra = {}) {
  return { product: { id, prices, ...extra }, qty: extra.qty || 1 };
}

console.log('compareBasket — intersection honnête');

ok('le moins cher est désigné sur intersection, pas sur total partiel', () => {
  const basket = [
    item('a', { 'Rami Levi': 10, 'Osher Ad': 12, 'Shufersal': 11, 'Yohananof': 13 }),
    item('b', { 'Rami Levi': 20, 'Osher Ad': 22, 'Shufersal': 21, 'Yohananof': 23 }),
    item('c', { 'Osher Ad': 5, 'Shufersal': 6, 'Yohananof': 7 }),
  ];
  const r = compareBasket(basket, CHAINS);
  assert.equal(r.intersectionCount, 2);
  assert.equal(r.totalComparable, 3);
  assert.equal(r.perChain['Rami Levi'].missingCount, 1);
  assert.equal(r.perChain['Rami Levi'].restrictedTotal, 30);
  assert.equal(r.perChain['Osher Ad'].restrictedTotal, 34);
  assert.equal(r.cheapestChain, 'Rami Levi');
});

ok('Rami Levi ne devient pas faussement le moins cher en cachant un article manquant', () => {
  const basket = [
    item('a', { 'Rami Levi': 100, 'Osher Ad': 10, 'Shufersal': 10, 'Yohananof': 10 }),
    item('b', { 'Osher Ad': 1, 'Shufersal': 1, 'Yohananof': 1 }),
  ];
  const r = compareBasket(basket, CHAINS);
  assert.equal(r.intersectionCount, 1);
  assert.equal(r.perChain['Rami Levi'].restrictedTotal, 100);
  assert.notEqual(r.cheapestChain, 'Rami Levi');
});

ok('fullTotal (partiel) et restrictedTotal (intersection) distincts et exposés', () => {
  const basket = [
    item('a', { 'Rami Levi': 10, 'Osher Ad': 10, 'Shufersal': 10, 'Yohananof': 10 }),
    item('b', { 'Osher Ad': 5 }),
  ];
  const r = compareBasket(basket, CHAINS);
  assert.equal(r.perChain['Osher Ad'].fullTotal, 15);
  assert.equal(r.perChain['Osher Ad'].restrictedTotal, 10);
  assert.equal(r.perChain['Osher Ad'].missingCount, 0);
  assert.equal(r.perChain['Rami Levi'].missingCount, 1);
  assert.equal(r.intersectionCount, 1);
});

console.log('compareBasket — produits au poids exclus');

ok('produit au poids exclu du comparatif et listé à part', () => {
  const basket = [
    item('a', { 'Rami Levi': 10, 'Osher Ad': 12, 'Shufersal': 11, 'Yohananof': 13 }),
    item('tomate', { 'Rami Levi': 5.9 }, { isWeighted: true, unit: 'kg' }),
  ];
  const { weighted, comparable } = splitWeighted(basket);
  assert.equal(weighted.length, 1);
  assert.equal(comparable.length, 1);
  const r = compareBasket(basket, CHAINS);
  assert.equal(r.totalComparable, 1);
  assert.equal(r.excludedWeighted.length, 1);
  assert.equal(r.excludedWeighted[0].id, 'tomate');
});

console.log('compareBasket — prix à l\'unité');

ok('le moins cher au litre peut différer du moins cher au prix brut', () => {
  const basket = [
    item('huile', { 'Rami Levi': 10, 'Osher Ad': 12 }, { unitPrices: { 'Rami Levi': 13.3, 'Osher Ad': 8.0 } }),
  ];
  const r = compareBasket(basket, CHAINS);
  const it = r.perItem[0];
  assert.equal(it.cheapest, 'Rami Levi');
  assert.equal(it.cheapestByUnit, 'Osher Ad');
});

ok('cheapestByUnit null quand aucune donnée de prix unitaire', () => {
  const basket = [item('x', { 'Rami Levi': 10 })];
  const r = compareBasket(basket, CHAINS);
  assert.equal(r.perItem[0].cheapestByUnit, null);
});

console.log('applyEquivalents — marques distributeur');

ok('un groupe d\'équivalents fusionne les prix pour la comparaison', () => {
  const groups = new Map();
  groups.set('lait-rami', {
    members: [{ prices: { 'Shufersal': 4.5 }, unitPrices: { 'Shufersal': 4.5 } }],
  });
  const basket = [item('lait-rami', { 'Rami Levi': 5.9 })];
  const merged = applyEquivalents(basket, groups);
  const r = compareBasket(merged, CHAINS);
  const it = r.perItem[0];
  assert.equal(it.prices['Rami Levi'], 5.9);
  assert.equal(it.prices['Shufersal'], 4.5);
  assert.equal(it.cheapest, 'Shufersal');
});

console.log('compareBasket — économie sur intersection');

ok('savings = plus cher - moins cher sur intersection', () => {
  const basket = [
    item('a', { 'Rami Levi': 10, 'Osher Ad': 12, 'Shufersal': 20, 'Yohananof': 15 }),
  ];
  const r = compareBasket(basket, CHAINS);
  assert.equal(r.cheapestChain, 'Rami Levi');
  assert.equal(r.dearestChain, 'Shufersal');
  assert.equal(r.savingsOnIntersection, 10);
});

console.log(`\n${passed} assertions passées.`);
