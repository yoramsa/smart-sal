import assert from 'node:assert';
import {
  parseFileName, fileMatchesStore, newestFileForStore, newestFile,
  extractStores, extractItems, parseXml, categorize, identifyStoreBrand, cleanName, isPromoName,
} from './lib/parse.mjs';

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

console.log('parseFileName / fileMatchesStore');

ok('publishedprices PriceFull date-time séparés', () => {
  const m = parseFileName('PriceFull7290058140886-001-20260519-043100.gz');
  assert.equal(m.kind, 'PriceFull');
  assert.equal(m.chainId, '7290058140886');
  assert.equal(m.storeId, '001');
  assert.equal(m.date, '20260519');
  assert.equal(m.time, '043100');
});

ok('shufersal PriceFull datetime collé', () => {
  const m = parseFileName('PriceFull7290027600007-042-20260519043100.gz');
  assert.equal(m.chainId, '7290027600007');
  assert.equal(m.storeId, '042');
  assert.equal(m.date, '20260519');
  assert.equal(m.sortKey, '20260519043100');
});

ok('avec subchain segment', () => {
  const m = parseFileName('PriceFull7290696200003-002-015-20260518-101500.gz');
  assert.equal(m.subchainId, '002');
  assert.equal(m.storeId, '015');
});

ok('Price incrémental (delta) reconnu et distinct de PriceFull', () => {
  assert.equal(parseFileName('Price7290058140886-001-20260519-090000.gz').kind, 'Price');
  assert.equal(parseFileName('PriceFull7290058140886-001-20260519-090000.gz').kind, 'PriceFull');
});

ok('StoresFull reconnu', () => {
  assert.equal(parseFileName('StoresFull7290058140886-000-20260519-000000.xml').kind, 'StoresFull');
});

ok('fileMatchesStore ignore les zéros de tête', () => {
  const meta = parseFileName('PriceFull7290058140886-007-20260519-043100.gz');
  assert.equal(fileMatchesStore(meta, { store_id: '7', chain_id: '7290058140886' }), true);
  assert.equal(fileMatchesStore(meta, { store_id: '070', chain_id: '7290058140886' }), false);
  assert.equal(fileMatchesStore(meta, { store_id: '7', chain_id: '9999999999999' }), false);
});

ok('newestFileForStore prend le plus récent du bon magasin', () => {
  const files = [
    'PriceFull7290058140886-001-20260519-043100.gz',
    'PriceFull7290058140886-001-20260519-091500.gz',
    'PriceFull7290058140886-002-20260519-091500.gz',
  ];
  const store = { store_id: '001', chain_id: '7290058140886' };
  assert.equal(newestFileForStore(files, store), 'PriceFull7290058140886-001-20260519-091500.gz');
});

ok('newestFile départage sur date puis heure', () => {
  const files = [
    'PriceFull7290027600007-042-20260518-235900.gz',
    'PriceFull7290027600007-042-20260519-000100.gz',
  ];
  assert.equal(newestFile(files), 'PriceFull7290027600007-042-20260519-000100.gz');
});

console.log('extractStores — variantes de structure');

ok('structure imbriquée SubChains > SubChain > Stores > Store', async () => {
  const xml = `<Root><SubChains><SubChain><SubChainId>1</SubChainId><ChainId>7290058140886</ChainId>
    <Stores><Store><StoreId>1</StoreId><StoreName>Rami Levi Talpiot</StoreName><City>Jerusalem</City></Store>
    <Store><StoreId>2</StoreId><StoreName>Rami Levi Givat Shaul</StoreName><City>Jerusalem</City></Store>
    </Stores></SubChain></SubChains></Root>`;
  const stores = extractStores(await parseXml(xml));
  assert.equal(stores.length, 2);
  assert.equal(stores[0].chain_id, '7290058140886');
  assert.equal(stores[0].store_id, '1');
  assert.equal(stores[0].name, 'Rami Levi Talpiot');
  assert.equal(stores[1].city, 'Jerusalem');
});

ok('structure plate Stores > Store avec ChainId par magasin', async () => {
  const xml = `<asx><Stores>
    <Store><ChainId>7290027600007</ChainId><SubChainId>2</SubChainId><StoreId>42</StoreId><StoreName>Shufersal Deal</StoreName><Address>Herzl 1</Address></Store>
    <Store><ChainId>7290027600007</ChainId><SubChainId>2</SubChainId><StoreId>43</StoreId><StoreName>Shufersal Sheli</StoreName></Store>
  </Stores></asx>`;
  const stores = extractStores(await parseXml(xml));
  assert.equal(stores.length, 2);
  assert.equal(stores[0].chain_id, '7290027600007');
  assert.equal(stores[0].store_id, '42');
  assert.equal(stores[0].address, 'Herzl 1');
});

ok('un seul magasin (non-array) géré', async () => {
  const xml = `<Root><Stores><Store><ChainId>7290803800003</ChainId><StoreId>5</StoreId><StoreName>Yohananof</StoreName></Store></Stores></Root>`;
  const stores = extractStores(await parseXml(xml));
  assert.equal(stores.length, 1);
  assert.equal(stores[0].store_id, '5');
});

console.log('extractItems — prix, unité, promo, poids, doublons EAN');

ok('unit_price et is_weighted conservés', async () => {
  const xml = `<Root><Items><Item>
    <ItemCode>7290000000001</ItemCode><ItemName>חלב 3% תנובה</ItemName>
    <ManufacturerName>תנובה</ManufacturerName><ItemPrice>5.90</ItemPrice>
    <UnitOfMeasure>ליטר</UnitOfMeasure><UnitOfMeasurePrice>5.90</UnitOfMeasurePrice>
    <Quantity>1</Quantity><bIsWeighted>0</bIsWeighted><ItemStatus>1</ItemStatus>
  </Item></Items></Root>`;
  const items = extractItems(await parseXml(xml));
  assert.equal(items.length, 1);
  assert.equal(items[0].unit_price, 5.9);
  assert.equal(items[0].is_weighted, false);
  assert.equal(items[0].name_he, 'חלב 3% תנובה');
});

ok('produit au poids détecté', async () => {
  const xml = `<Root><Items><Item>
    <ItemCode>2000000000001</ItemCode><ItemName>עגבניה</ItemName><ItemPrice>5.90</ItemPrice>
    <UnitOfMeasure>ק"ג</UnitOfMeasure><UnitOfMeasurePrice>5.90</UnitOfMeasurePrice>
    <bIsWeighted>1</bIsWeighted><ItemStatus>1</ItemStatus>
  </Item></Items></Root>`;
  const items = extractItems(await parseXml(xml));
  assert.equal(items[0].is_weighted, true);
});

ok('promo dans le nom → is_promo, nom nettoyé', async () => {
  const xml = `<Root><Items><Item>
    <ItemCode>7290000000002</ItemCode><ItemName>*מבצע* שמן זית כתית</ItemName><ItemPrice>29.90</ItemPrice>
    <ItemStatus>1</ItemStatus>
  </Item></Items></Root>`;
  const items = extractItems(await parseXml(xml));
  assert.equal(items[0].is_promo, true);
  assert.equal(items[0].name_he, 'שמן זית כתית');
});

ok('doublons EAN dans un même fichier dédoublonnés', async () => {
  const xml = `<Root><Items>
    <Item><ItemCode>7290000000003</ItemCode><ItemName>מוצר</ItemName><ItemPrice>10</ItemPrice><ItemStatus>1</ItemStatus></Item>
    <Item><ItemCode>7290000000003</ItemCode><ItemName>מוצר עדכני</ItemName><ItemPrice>12</ItemPrice><ItemStatus>1</ItemStatus></Item>
  </Items></Root>`;
  const items = extractItems(await parseXml(xml));
  assert.equal(items.length, 1);
  assert.equal(items[0].price, 12);
});

ok('lignes invalides filtrées (prix 0, status 0, sans ean)', async () => {
  const xml = `<Root><Items>
    <Item><ItemCode>7290000000004</ItemCode><ItemName>x</ItemName><ItemPrice>0</ItemPrice><ItemStatus>1</ItemStatus></Item>
    <Item><ItemCode>7290000000005</ItemCode><ItemName>y</ItemName><ItemPrice>9</ItemPrice><ItemStatus>0</ItemStatus></Item>
    <Item><ItemCode></ItemCode><ItemName>z</ItemName><ItemPrice>9</ItemPrice><ItemStatus>1</ItemStatus></Item>
  </Items></Root>`;
  const items = extractItems(await parseXml(xml));
  assert.equal(items.length, 0);
});

console.log('categorize / identifyStoreBrand');

ok('catégorisation crémerie', () => {
  assert.equal(categorize('חלב 3% תנובה', 'תנובה').cat, '🥛 Crémerie & Œufs');
});
ok('marque distributeur Rami Levi', () => {
  assert.equal(identifyStoreBrand('מותג רמי לוי', 'קמח'), 'Rami Levi');
});
ok('cleanName retire étoiles et מבצע', () => {
  assert.equal(cleanName('★ *מבצע* לחם ★'), 'לחם');
  assert.equal(isPromoName('*מבצע* לחם'), true);
});

console.log(`\n${passed} assertions passées.`);
