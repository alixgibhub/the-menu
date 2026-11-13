// This week's supermarket deals.
//
// The deals database is public/data/deals.json in this repo. Every Sunday a
// scheduled Claude task researches each country's promotions for the coming week,
// checks the file with scripts/validate-deals.mjs and commits it; Cloudflare
// redeploys on every push. Deals posted by hand on /admin live in KV, on top.

import { COUNTRIES } from "../public/countries.js";

const iso = (d) => d.toISOString().slice(0, 10);
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Hand-posted deals (KV), keyed "CC/Store".
async function readManualDeals(env) {
  const raw = await env.MENU_KV.get("deals");
  return raw ? JSON.parse(raw) : { stores: {} };
}

// The researched deals file, served with the app's static files.
async function readResearchedDeals(env, request) {
  try {
    const res = await env.ASSETS.fetch(new URL("/data/deals.json", request.url));
    if (res.ok) return await res.json();
  } catch {}
  return { stores: {}, countries: {} };
}

// Everything the app and the menu prompt use: researched plus hand-posted deals,
// expired ones dropped. Researched deals are tagged "auto", so the admin editor
// only shows the hand-posted ones.
export async function readDeals(env, request) {
  const [auto, manual] = await Promise.all([readResearchedDeals(env, request), readManualDeals(env)]);
  const today = iso(new Date());
  const stores = {};
  for (const [src, researched] of [[manual.stores, false], [auto.stores, true]]) {
    for (const [key, list] of Object.entries(src || {})) {
      const live = (list || []).filter((d) => !d.validTo || d.validTo >= today).map((d) => (researched ? { ...d, auto: true } : d));
      if (live.length) stores[key] = [...(stores[key] || []), ...live];
    }
  }
  return { updated: auto.updated || manual.updated || null, countries: auto.countries || {}, stores };
}

// Keep only well-formed deals for known stores, still valid, with a real source.
// Used by scripts/validate-deals.mjs before the file is committed.
export function cleanDeals(found, cc, today = iso(new Date())) {
  const c = COUNTRIES[cc];
  const stores = Object.keys(c.stores);
  const cards = new Set(Object.values(c.stores).filter(Boolean));
  const out = {};
  for (const [name, list] of Object.entries(found || {})) {
    const store = stores.find((s) => s.toLowerCase() === String(name).toLowerCase());
    if (!store || !Array.isArray(list)) continue;
    const clean = list.map((d) => {
      const price = Number(d.price), was = Number(d.was);
      const item = String(d.item || "").trim().slice(0, 120);
      const source = /^https?:\/\/[^\s]+$/.test(d.source || "") ? String(d.source).slice(0, 400) : null;
      if (!item || !(price > 0) || price > 10000 || !source) return null;
      const validTo = isDate(d.validTo) ? d.validTo : null;
      if (validTo && validTo < today) return null;
      return {
        item, price: Math.round(price * 100) / 100,
        ...(was > price ? { was: Math.round(was * 100) / 100 } : {}),
        ...(isDate(d.validFrom) ? { validFrom: d.validFrom } : {}),
        ...(validTo ? { validTo } : {}),
        ...(d.card && cards.has(d.card) ? { card: d.card } : {}),
        source,
      };
    }).filter(Boolean)
      // biggest saving first
      .sort((x, y) => ((y.was ? 1 - y.price / y.was : 0) - (x.was ? 1 - x.price / x.was : 0)))
      .slice(0, 12);
    if (clean.length) out[store] = clean;
  }
  return out;
}
