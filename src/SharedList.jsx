import { useState, useEffect, useRef, useCallback } from "react";
import { searchProducts, getPricesForEans } from "./db.js";
import { fetchList, fetchItems, addItem, updateItem, removeItem, renameList, subscribeItems, createList } from "./lists.js";

const V = {
  violet: "#7C3AED", violetDark: "#5B3AA6", violetLight: "#F3EEFB",
  bg: "#F6F4FB", card: "#FFFFFF", text: "#241C33", muted: "#8A8398",
};

function hasHebrew(s) { return /[֐-׿]/.test(s || ""); }

function cheapestFromPrices(pricesByEan, ean) {
  const entry = pricesByEan[ean];
  if (!entry) return { price: null, chain: null };
  let best = Infinity, chain = null;
  for (const [c, p] of Object.entries(entry.prices || {})) if (p < best) { best = p; chain = c; }
  return best === Infinity ? { price: null, chain: null } : { price: best, chain };
}

export default function SharedList() {
  const params = new URLSearchParams(window.location.search);
  const [listId, setListId] = useState(params.get("l"));
  const [list, setList] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const searchTimer = useRef(null);

  const reload = useCallback(async () => {
    if (!listId) return;
    const rows = await fetchItems(listId);
    setItems(rows);
  }, [listId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!listId) { setLoading(false); return; }
      setLoading(true);
      const [l, rows] = await Promise.all([fetchList(listId), fetchItems(listId)]);
      if (cancelled) return;
      setList(l);
      setItems(rows);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [listId]);

  useEffect(() => {
    if (!listId) return;
    const unsub = subscribeItems(listId, () => { reload(); });
    return unsub;
  }, [listId, reload]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const rows = await searchProducts(query.trim(), 8);
        setResults(rows);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const startList = async () => {
    const id = await createList("Notre liste");
    const url = new URL(window.location.href);
    url.searchParams.set("l", id);
    window.history.replaceState({}, "", url);
    setListId(id);
  };

  const addProduct = async (p) => {
    setQuery(""); setResults([]);
    const existing = items.find(it => it.ean && it.ean === p.ean);
    if (existing) { await updateItem(existing.id, { qty: Number(existing.qty) + 1 }); reload(); return; }
    let price = null, chain = null;
    try { const pr = await getPricesForEans([p.ean]); const c = cheapestFromPrices(pr, p.ean); price = c.price; chain = c.chain; } catch {}
    const optimistic = { id: `tmp-${Date.now()}`, list_id: listId, ean: p.ean, name: p.name, name_he: p.name_he, emoji: p.emoji, category: p.cat, unit: p.unit, qty: 1, price, chain, checked: false };
    setItems(prev => [...prev, optimistic]);
    try { await addItem(listId, { ean: p.ean, name: p.name, name_he: p.name_he, emoji: p.emoji, category: p.cat, unit: p.unit, qty: 1, price, chain }); } catch {}
    reload();
  };

  const addFreeText = async () => {
    const text = query.trim();
    if (!text) return;
    setQuery(""); setResults([]);
    const optimistic = { id: `tmp-${Date.now()}`, name: text, emoji: "📝", category: "🛒 Divers", qty: 1, checked: false };
    setItems(prev => [...prev, optimistic]);
    try { await addItem(listId, { name: text, emoji: "📝", category: "🛒 Divers", qty: 1 }); } catch {}
    reload();
  };

  const toggle = async (it) => {
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, checked: !x.checked } : x));
    try { await updateItem(it.id, { checked: !it.checked }); } catch {}
  };
  const changeQty = async (it, delta) => {
    const q = Math.max(1, Number(it.qty) + delta);
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, qty: q } : x));
    try { await updateItem(it.id, { qty: q }); } catch {}
  };
  const del = async (it) => {
    setItems(prev => prev.filter(x => x.id !== it.id));
    try { await removeItem(it.id); } catch {}
  };

  const share = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const shareWhatsApp = () => {
    const url = window.location.href;
    const msg = encodeURIComponent(`🛒 Notre liste de courses — ajoute ce que tu veux, je la vois en direct :\n${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const total = items.length;
  const done = items.filter(i => i.checked).length;
  const pct = total ? Math.round(done / total * 100) : 0;

  const groups = {};
  for (const it of items) {
    const cat = it.category || "🛒 Divers";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(it);
  }
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
  }

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .sl-press:active{transform:scale(0.97);}
        .sl-fade{animation:slf .25s ease;}
        @keyframes slf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {!listId ? (
        <div style={S.welcome}>
          <div style={{ fontSize: 60 }}>🛒</div>
          <div style={S.welcomeTitle}>Votre liste de courses, à deux</div>
          <div style={S.welcomeSub}>Une liste partagée en temps réel. Ta moitié ajoute, tu vois tout apparaître — et tu coches ce que tu prends.</div>
          <button className="sl-press" onClick={startList} style={S.bigBtn}>Créer notre liste →</button>
        </div>
      ) : (
        <>
          <div style={S.header}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={list?.name || "Notre liste"}
                  onChange={e => setList(l => ({ ...(l || {}), name: e.target.value }))}
                  onBlur={e => renameList(listId, e.target.value)}
                  style={S.nameInput}
                />
                <div style={S.liveTag}><span style={S.dot} /> En direct · {total} article{total > 1 ? "s" : ""}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${pct}%` }} /></div>
              <div style={S.progressLabel}>{done}/{total} pris · {pct}%</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="sl-press" onClick={share} style={S.sharePill}>{copied ? "✓ Lien copié" : "🔗 Copier le lien"}</button>
              <button className="sl-press" onClick={shareWhatsApp} style={{ ...S.sharePill, background: "#25D366", color: "#fff", border: "none" }}>📲 WhatsApp</button>
            </div>
          </div>

          <div style={S.addWrap}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="➕ Ajoute un produit…"
              style={S.addInput}
            />
            {query.trim() && (
              <div style={S.dropdown} className="sl-fade">
                {searching && <div style={S.dropInfo}>Recherche…</div>}
                {!searching && results.length === 0 && (
                  <div className="sl-press" onClick={addFreeText} style={S.dropAddText}>
                    ➕ Ajouter « {query.trim()} » en texte libre
                  </div>
                )}
                {results.map(p => (
                  <div key={p.ean} className="sl-press" onClick={() => addProduct(p)} style={S.dropRow}>
                    <span style={{ fontSize: 20 }}>{p.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: V.text, direction: hasHebrew(p.name) ? "rtl" : "ltr", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: V.muted }}>{p.cat}</div>
                    </div>
                    <span style={{ fontSize: 20, color: V.violet, fontWeight: 800 }}>+</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={S.body}>
            {loading ? (
              <div style={S.empty}>Chargement…</div>
            ) : total === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 46 }}>📝</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: V.violetDark, marginTop: 10 }}>Liste vide</div>
                <div style={{ fontSize: 13, color: V.muted, marginTop: 4 }}>Ajoute ton premier article ci-dessus.</div>
              </div>
            ) : (
              Object.entries(groups).map(([cat, list]) => (
                <div key={cat} style={{ marginBottom: 18 }}>
                  <div style={S.catHead}>{cat}</div>
                  {list.map(it => (
                    <div key={it.id} className="sl-fade" style={{ ...S.item, opacity: it.checked ? 0.5 : 1 }}>
                      <div className="sl-press" onClick={() => toggle(it)} style={{ ...S.check, background: it.checked ? V.violet : "transparent", borderColor: it.checked ? V.violet : "#D8D1E6" }}>
                        {it.checked && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 22, flexShrink: 0 }}>{it.emoji || "🛒"}</div>
                      <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggle(it)}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: V.text, textDecoration: it.checked ? "line-through" : "none", direction: hasHebrew(it.name) ? "rtl" : "ltr", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                        {it.name_he && !hasHebrew(it.name) && <div style={{ fontSize: 11, color: V.muted, direction: "rtl" }}>{it.name_he}</div>}
                        {it.price != null && <div style={{ fontSize: 11, color: V.violet, fontWeight: 600 }}>dès {Number(it.price).toFixed(1)}₪{it.chain ? ` · ${it.chain}` : ""}</div>}
                      </div>
                      <div style={S.qtyBox} onClick={e => e.stopPropagation()}>
                        <button className="sl-press" onClick={() => changeQty(it, -1)} style={S.qtyBtn}>−</button>
                        <span style={S.qtyNum}>{Number(it.qty)}</span>
                        <button className="sl-press" onClick={() => changeQty(it, +1)} style={S.qtyBtn}>+</button>
                      </div>
                      <button className="sl-press" onClick={() => del(it)} style={S.delBtn}>✕</button>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div style={{ height: 40 }} />
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  root: { fontFamily: "'DM Sans',sans-serif", background: V.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", color: V.text },
  welcome: { padding: "80px 26px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  welcomeTitle: { fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: V.violetDark, marginTop: 8 },
  welcomeSub: { fontSize: 14, color: V.muted, lineHeight: 1.6, maxWidth: 320, marginBottom: 8 },
  bigBtn: { marginTop: 12, background: V.violet, color: "#fff", border: "none", borderRadius: 16, padding: "16px 28px", fontSize: 16, fontWeight: 800, fontFamily: "'Syne',sans-serif", cursor: "pointer", boxShadow: "0 8px 24px rgba(124,58,237,0.35)" },
  header: { background: `linear-gradient(135deg, ${V.violet}, #9F67F0)`, padding: "44px 20px 20px", color: "#fff", borderRadius: "0 0 24px 24px" },
  nameInput: { background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, width: "100%", padding: 0 },
  liveTag: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#7CF5A0", boxShadow: "0 0 0 3px rgba(124,245,160,0.3)" },
  progressTrack: { height: 7, background: "rgba(255,255,255,0.25)", borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", background: "#fff", borderRadius: 10, transition: "width 0.4s ease" },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.85)", textAlign: "right", marginTop: 5 },
  sharePill: { flex: 1, padding: "10px 8px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  addWrap: { position: "relative", padding: "14px 16px 0" },
  addInput: { width: "100%", padding: "14px 16px", borderRadius: 14, border: "1.5px solid #E7E1F2", fontSize: 15, fontFamily: "'DM Sans',sans-serif", background: "#fff", outline: "none", color: V.text, boxShadow: "0 2px 10px rgba(90,58,166,0.06)" },
  dropdown: { position: "absolute", left: 16, right: 16, top: "100%", marginTop: 6, background: "#fff", borderRadius: 14, boxShadow: "0 10px 30px rgba(36,28,51,0.15)", zIndex: 20, overflow: "hidden", maxHeight: 320, overflowY: "auto" },
  dropInfo: { padding: "12px 16px", fontSize: 13, color: V.muted },
  dropAddText: { padding: "13px 16px", fontSize: 14, color: V.violet, fontWeight: 700, cursor: "pointer" },
  dropRow: { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #F3F0F9" },
  body: { padding: "16px" },
  catHead: { fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 12, color: V.violetDark, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingLeft: 2 },
  item: { display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 16, padding: "11px 12px", marginBottom: 8, boxShadow: "0 2px 8px rgba(36,28,51,0.05)" },
  check: { width: 26, height: 26, borderRadius: "50%", border: "2px solid #D8D1E6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" },
  qtyBox: { display: "flex", alignItems: "center", gap: 2, background: V.violetLight, borderRadius: 10, padding: "2px 4px", flexShrink: 0 },
  qtyBtn: { width: 26, height: 26, borderRadius: 8, border: "none", background: "transparent", color: V.violetDark, fontSize: 18, fontWeight: 700, cursor: "pointer", lineHeight: 1 },
  qtyNum: { minWidth: 20, textAlign: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: V.violetDark },
  delBtn: { background: "transparent", border: "none", color: "#C9C2D6", fontSize: 15, cursor: "pointer", flexShrink: 0, padding: "4px 2px" },
  empty: { textAlign: "center", padding: "50px 20px", color: V.muted },
};
