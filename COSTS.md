# Coûts de SmartSal

Estimation des coûts d'exploitation. Les services facturent en **USD** ; conversion indicative **1 $ ≈ 3,7 ₪**. Les tarifs LLM sont ceux de l'API Anthropic première partie (susceptibles d'évoluer).

Règle de lecture rapide :
- **Mettre à jour un prix = gratuit** (écriture Supabase, forfait fixe).
- **L'API LLM payante n'est appelée que pour traduire un nom de produit jamais vu**, une seule fois par EAN.

---

## 1. Les deux « API » ne se facturent pas pareil

| API | Appelée quand | Facturation |
|---|---|---|
| **Supabase** (lire/écrire prix et produits) | à chaque synchro (2–4×/jour) | **Forfait fixe** par palier (gratuit ou 25 $/mois). La requête n'est **pas** facturée à l'unité : écrire 1 ligne ou 1 million coûte pareil. Ce qui compte : taille de la base, trafic sortant. |
| **Anthropic LLM** (traduire un nom) | uniquement sur `translated_at IS NULL` | **Au jeton.** Jamais déclenchée par un changement de prix. |

---

## 2. Coût unique — traduction initiale des noms

Le nombre réel d'EAN distincts ne sera connu qu'après une vraie synchro. Ordre de grandeur : **30 000 à 60 000** produits distincts sur 4 enseignes.

Coût ≈ 0,25 M jetons entrée + 0,25 M sortie **par tranche de 10 000 produits**.

| Produits | Haiku 4.5 (1 $/5 $) | Sonnet 5 (3 $/15 $) | Opus 5 (5 $/25 $) |
|---|---|---|---|
| 20 000 | ~3 $ | ~9 $ | ~15 $ |
| 40 000 | ~6 $ | ~18 $ | ~30 $ |
| 60 000 | ~9 $ | ~27 $ | ~45 $ |

Leviers :
- **Haiku 4.5** suffit pour des noms de produits (colonne de gauche).
- **Batch API** (traitement asynchrone) = **−50 %**.
- **Prompt caching** du prompt système = quasi nul en plus.

→ Même à 60 000 produits : **~5 à 9 $ une seule fois** (Haiku + Batch). Jamais retraduit ensuite (`translated_at`).

Commande :
```bash
npm run translate            # dictionnaire d'abord, chiffre le reste (gratuit)
npm run translate -- --llm   # LLM sur le reste (ANTHROPIC_API_KEY requis)
# modèle par défaut claude-opus-5 ; pour réduire le coût :
ANTHROPIC_MODEL=claude-haiku-4-5 npm run translate -- --llm
```

---

## 3. Coûts récurrents mensuels

| Poste | Gratuit couvre ? | Si dépassement |
|---|---|---|
| **Supabase** | ✅ 500 Mo base + 5 Go trafic. Données ~30–60 Mo à petite échelle. Le cron garde le projet actif. | **Pro 25 $/mois** si beaucoup de magasins / sauvegardes / pas de pause. |
| **GitHub Actions** (sync 4×/jour) | ✅ Repo public = illimité. Privé = 2 000 min/mois (usage ~750). | 0 $ dans les faits. |
| **Hébergement app** (Vercel/Netlify/Cloudflare Pages) | ✅ Site statique | 0 $ |
| **Traduction incrémentale** (nouveaux produits) | — | quelques centimes/mois |
| **Portails de prix** (loi de transparence) | ✅ données publiques | 0 $ |

**Le vrai driver de coût récurrent = le nombre de magasins suivis (`is_tracked`)**, pas le LLM :
- `prices` = produits × magasins. 10 magasins ≈ 400k lignes (~60 Mo, gratuit) ; 100 magasins ≈ 4 M lignes (→ Pro).

---

## 4. `price_history` : stockage, pas API

Chaque **changement** de prix ajoute une ligne d'historique (voulu). Ce n'est pas un coût d'API mais de **stockage**. Purge possible quand ça approche la limite gratuite :

```sql
delete from price_history where changed_at < now() - interval '6 months';
```

---

## 5. Si on active l'IA d'interprétation de liste (plus tard)

Fonctionnalité optionnelle non activée aujourd'hui. Si un jour chaque liste passe par un LLM, le coût devient **par utilisation** (scale avec le trafic), via une petite fonction serveur (Supabase Edge Function) qui cache la clé.

Ordre de grandeur en Haiku (~2–4 agorot par liste de 20 articles, avec cache) :

| Trafic | Coût/mois |
|---|---|
| 100 listes/jour | ~15–30 ₪ |
| 1 000 listes/jour | ~150–300 ₪ |

À maîtriser via : mode **hybride** (IA seulement sur les cas ambigus), **Haiku**, **prompt caching**.

---

## 6. Optionnel

- **Nom de domaine** (ex. `smartsal.co.il`) : ~10–15 $/an.

---

## 7. Résumé

| Scénario | Coût |
|---|---|
| **Démarrage / MVP** (quelques magasins, sans domaine) | **~3–9 $ une seule fois** (traduction Haiku) puis **0 $/mois** |
| **À l'échelle** (beaucoup de magasins, domaine) | ~**25 $/mois** (Supabase Pro) + ~12 $/an domaine |
| **+ IA de liste activée** | + ~15–300 ₪/mois selon le trafic |

Ce qui coûte, dans l'ordre : **Supabase Pro** (si beaucoup de magasins) > **traduction initiale** (one-off) > **IA de liste** (si activée) > le reste ≈ 0.
