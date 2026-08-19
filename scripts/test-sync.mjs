import { gzipSync } from 'node:zlib';

process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';
process.argv = ['node', 'test-sync.mjs', '--mode=full', '--chain=RamiLevi'];

const storesXml = `<Root><SubChains><SubChain><ChainId>7290058140886</ChainId><SubChainId>1</SubChainId>
  <Stores><Store><StoreId>1</StoreId><StoreName>Rami Levi Talpiot</StoreName><City>Jerusalem</City></Store></Stores>
</SubChain></SubChains></Root>`;

const priceXml = `<Root><Items>
  <Item><ItemCode>7290000000001</ItemCode><ItemName>*מבצע* חלב 3% תנובה</ItemName><ManufacturerName>תנובה</ManufacturerName>
    <ItemPrice>5.90</ItemPrice><UnitOfMeasure>ליטר</UnitOfMeasure><UnitOfMeasurePrice>5.90</UnitOfMeasurePrice>
    <Quantity>1</Quantity><bIsWeighted>0</bIsWeighted><ItemStatus>1</ItemStatus></Item>
  <Item><ItemCode>2000000000002</ItemCode><ItemName>עגבניה</ItemName><ItemPrice>5.90</ItemPrice>
    <UnitOfMeasure>ק"ג</UnitOfMeasure><UnitOfMeasurePrice>5.90</UnitOfMeasurePrice><bIsWeighted>1</bIsWeighted><ItemStatus>1</ItemStatus></Item>
</Items></Root>`;

const captured = { products: [], prices: [], syncRuns: [], patches: [] };

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers } });
  const html = (s, headers = {}) => new Response(s, { status: 200, headers: { 'content-type': 'text/html', ...headers } });
  const bytes = (buf, status = 200) => new Response(buf, { status });

  if (u.endsWith('/login') && (!opts.method || opts.method === 'GET')) {
    return html('<meta name="csrftoken" content="TOK123">', { 'set-cookie': 'sess=abc; Path=/' });
  }
  if (u.endsWith('/login/user')) {
    return new Response('', { status: 302, headers: { 'set-cookie': 'auth=xyz; Path=/' } });
  }
  if (u.endsWith('publishedprices.co.il/')) {
    return html('<meta name="csrftoken" content="TOK456"> dashboard');
  }
  if (u.endsWith('/file/json/dir')) {
    const body = String(opts.body || '');
    const isStores = /sSearch=Stores/.test(body);
    const names = isStores
      ? [{ fname: 'StoresFull7290058140886-000-20260519-000000.xml' }]
      : [{ fname: 'PriceFull7290058140886-001-20260519-091500.gz' }, { fname: 'PriceFull7290058140886-001-20260519-043100.gz' }];
    return json({ aaData: names, iTotalRecords: names.length, iTotalDisplayRecords: names.length });
  }
  if (u.includes('/file/d/')) {
    const xml = u.includes('StoresFull') ? storesXml : priceXml;
    return bytes(gzipSync(Buffer.from(xml, 'utf-8')));
  }

  if (u.includes('/rest/v1/sync_runs') && opts.method === 'POST') {
    captured.syncRuns.push(JSON.parse(opts.body));
    return json([{ id: captured.syncRuns.length }]);
  }
  if (u.includes('/rest/v1/sync_runs') && opts.method === 'PATCH') {
    captured.patches.push(JSON.parse(opts.body));
    return new Response(null, { status: 204 });
  }
  if (u.includes('/rest/v1/stores') && (!opts.method || opts.method === 'GET')) {
    return json([{ id: 10, store_id: '1', chain_id: '7290058140886' }]);
  }
  if (u.includes('/rest/v1/stores') && opts.method === 'POST') {
    return new Response('', { status: 201 });
  }
  if (u.includes('/rest/v1/products') && opts.method === 'POST') {
    captured.products.push(...JSON.parse(opts.body));
    return new Response('', { status: 201 });
  }
  if (u.includes('/rest/v1/prices') && opts.method === 'POST') {
    captured.prices.push(...JSON.parse(opts.body));
    return new Response('', { status: 201 });
  }
  throw new Error('URL non mockée: ' + opts.method + ' ' + u);
};

const { main } = await import('./sync-supabase.mjs');
await main();

console.log('\n--- Vérifications ---');
let passed = 0;
const ok = (name, cond) => { if (cond) { passed++; console.log('  ✓', name); } else { console.error('  ✗', name); process.exitCode = 1; } };

ok('sync_run créé pour la tentative', captured.syncRuns.length === 1 && captured.syncRuns[0].mode === 'full');
ok('sync_run clôturé avec succès', captured.patches.some(p => p.status === 'success' && p.finished_at));
ok('2 produits upsertés', captured.products.length === 2);
ok('name_fr JAMAIS envoyé (préservé)', captured.products.every(p => !('name_fr' in p) && !('translated_at' in p)));
ok('promo nettoyée dans name_he', captured.products.find(p => p.ean === '7290000000001').name_he === 'חלב 3% תנובה');
ok('produit au poids marqué is_weighted', captured.products.find(p => p.ean === '2000000000002').is_weighted === true);
ok('unit_price conservé sur les prix', captured.prices.every(p => p.unit_price === 5.9));
ok('is_promo remonté sur le lait', captured.prices.find(p => p.ean === '7290000000001').is_promo === true);
ok('store_id = id numérique du magasin en base', captured.prices.every(p => p.store_id === 10));
ok('collected_at renseigné', captured.prices.every(p => typeof p.collected_at === 'string'));

console.log(`\n${passed} vérifications passées.`);
