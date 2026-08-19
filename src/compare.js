function qtyOf(item) {
  return item.qty || 1;
}

function priceAt(item, chain) {
  const p = item.product.prices;
  return p ? p[chain] : undefined;
}

function unitPriceAt(item, chain) {
  const u = item.product.unitPrices;
  return u ? u[chain] : undefined;
}

export function splitWeighted(basket) {
  const weighted = [];
  const comparable = [];
  for (const item of basket) {
    if (item.product.isWeighted) weighted.push(item);
    else comparable.push(item);
  }
  return { weighted, comparable };
}

export function compareBasket(basket, chains) {
  const { weighted, comparable } = splitWeighted(basket);

  const availableEverywhere = comparable.filter(
    (it) => chains.every((c) => priceAt(it, c) != null)
  );

  const perChain = {};
  for (const c of chains) {
    const available = comparable.filter((it) => priceAt(it, c) != null);
    perChain[c] = {
      availableCount: available.length,
      missingCount: comparable.length - available.length,
      fullTotal: available.reduce((s, it) => s + priceAt(it, c) * qtyOf(it), 0),
      restrictedTotal: availableEverywhere.reduce((s, it) => s + priceAt(it, c) * qtyOf(it), 0),
    };
  }

  let cheapestChain = null;
  let cheapestTotal = Infinity;
  let dearestChain = null;
  let dearestTotal = -Infinity;
  if (availableEverywhere.length > 0) {
    for (const c of chains) {
      const t = perChain[c].restrictedTotal;
      if (t < cheapestTotal) { cheapestTotal = t; cheapestChain = c; }
      if (t > dearestTotal) { dearestTotal = t; dearestChain = c; }
    }
  }

  const perItem = comparable.map((it) => {
    const prices = {};
    const unitPrices = {};
    for (const c of chains) {
      const p = priceAt(it, c);
      if (p != null) prices[c] = p;
      const u = unitPriceAt(it, c);
      if (u != null) unitPrices[c] = u;
    }
    const priceChains = Object.keys(prices);
    const unitChains = Object.keys(unitPrices);
    const cheapest = priceChains.reduce(
      (a, b) => (prices[b] < prices[a] ? b : a),
      priceChains[0]
    );
    const cheapestByUnit = unitChains.length
      ? unitChains.reduce((a, b) => (unitPrices[b] < unitPrices[a] ? b : a), unitChains[0])
      : null;
    return {
      id: it.product.ean ?? it.product.id,
      qty: qtyOf(it),
      unit: it.product.unit || null,
      prices,
      unitPrices,
      cheapest,
      cheapestByUnit,
      missingAt: chains.filter((c) => prices[c] == null),
    };
  });

  return {
    chains,
    perChain,
    perItem,
    intersectionCount: availableEverywhere.length,
    totalComparable: comparable.length,
    cheapestChain,
    cheapestTotal: cheapestChain ? cheapestTotal : 0,
    dearestChain,
    dearestTotal: dearestChain ? dearestTotal : 0,
    savingsOnIntersection: cheapestChain ? dearestTotal - cheapestTotal : 0,
    excludedWeighted: weighted.map((it) => ({
      id: it.product.ean ?? it.product.id,
      qty: qtyOf(it),
      unit: it.product.unit || null,
    })),
  };
}

export function applyEquivalents(basket, groups) {
  if (!groups || groups.size === 0) return basket;
  return basket.map((item) => {
    const id = item.product.ean ?? item.product.id;
    const group = groups.get(String(id));
    if (!group) return item;
    const mergedPrices = { ...(item.product.prices || {}) };
    const mergedUnit = { ...(item.product.unitPrices || {}) };
    for (const member of group.members) {
      for (const c of Object.keys(member.prices || {})) {
        if (mergedPrices[c] == null || member.prices[c] < mergedPrices[c]) {
          mergedPrices[c] = member.prices[c];
          if (member.unitPrices && member.unitPrices[c] != null) mergedUnit[c] = member.unitPrices[c];
        }
      }
    }
    return { ...item, product: { ...item.product, prices: mergedPrices, unitPrices: mergedUnit } };
  });
}
