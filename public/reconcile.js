// Checks a written menu against the real deals, so "Promo" stamps and
// "shop by" dates come from the deals database, not from the model's memory.
// Pure functions: used by the app and by the tests.

const words = (s) => String(s || "")
  .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z\s]/g, " ").split(/\s+/)
  .filter((w) => w.length >= 3 && !["met", "with", "les", "des", "and", "pack", "xxl", "bio"].includes(w));

// 0–1: how much of the shorter name the longer one covers.
export function similarity(a, b) {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const w of A) if (B.has(w) || [...B].some((x) => x.startsWith(w) || w.startsWith(x))) common++;
  return common / Math.min(A.size, B.size);
}

// The deal this list item comes from, or null.
export function findDeal(item, list) {
  if (!list?.length) return null;
  const named = String(item.deal || "").trim().toLowerCase();
  if (named) {
    const exact = list.find((d) => d.item.trim().toLowerCase() === named);
    if (exact) return exact;
  }
  let best = null, score = 0;
  for (const d of list) {
    const s = Math.max(similarity(item.deal, d.item), similarity(item.item, d.item));
    if (s > score) { best = d; score = s; }
  }
  return score >= 0.5 ? best : null;
}

// Money saved on one list item: the deal's regular price minus its promo price,
// times the number of packs bought (the item's price / the deal's price). Only
// when the deal shows a regular price, so the saving is never guessed.
export function savedOn(item, deal) {
  if (!(deal?.was > deal?.price) || !(deal.price > 0)) return 0;
  const packs = Math.min(10, Math.max(1, Math.round((Number(item.price) || deal.price) / deal.price)));
  return Math.round((deal.was - deal.price) * packs * 100) / 100;
}

// Fixes every promo item in place: end date and saving from its deal, and no
// promo mark without a real deal behind it. Returns how many items were changed.
export function reconcile(plan, deals, country) {
  if (!deals?.stores || !Array.isArray(plan?.shopping)) return 0;
  const keys = Object.keys(deals.stores);
  let changed = 0;
  for (const s of plan.shopping) {
    const key = keys.find((k) => k.toLowerCase() === `${country}/${s.store}`.toLowerCase());
    const list = key ? deals.stores[key] : [];
    for (const i of s.items || []) {
      if (!i.promo) continue;
      const d = findDeal(i, list);
      if (!d) { i.promo = false; delete i.until; delete i.saved; changed++; continue; }
      const saved = savedOn(i, d);
      if (saved) i.saved = saved; else delete i.saved;
      const until = d.validTo || undefined;
      if (i.until !== until) changed++;
      if (until) i.until = until; else delete i.until;
    }
  }
  return changed;
}
