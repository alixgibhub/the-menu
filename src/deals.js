// Finds this week's supermarket promotions automatically.
//
// For one country at a time, Claude searches the web (store leaflets, folder and
// promo sites) for current deals on healthy everyday groceries at that country's
// supermarkets, and returns them as structured data with a source link for each.
// The results replace that country's previous automatic deals. Deals you post by
// hand on /admin are kept as they are.

import { COUNTRIES } from "../public/countries.js";

const DAY = 24 * 60 * 60 * 1000;
const iso = (d) => d.toISOString().slice(0, 10);
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function readDeals(env) {
  const raw = await env.MENU_KV.get("deals");
  const deals = raw ? JSON.parse(raw) : {};
  deals.stores = deals.stores || {};
  deals.countries = deals.countries || {};
  // Older deals were saved without a country: they are Belgian.
  for (const key of Object.keys(deals.stores)) {
    if (!key.includes("/")) { deals.stores[`BE/${key}`] = deals.stores[key]; delete deals.stores[key]; }
  }
  return deals;
}

// Which country is most overdue for fresh deals (or null if none is).
export function nextCountry(deals, refreshDays) {
  let pick = null, oldest = Infinity;
  for (const cc of Object.keys(COUNTRIES)) {
    const at = Date.parse(deals.countries[cc]?.checked || "") || 0;
    if (Date.now() - at >= refreshDays * DAY && at < oldest) { oldest = at; pick = cc; }
  }
  return pick;
}

// Called by the hourly schedule: refresh the most overdue country, if any.
export async function refreshNext(env) {
  const deals = await readDeals(env);
  const cc = nextCountry(deals, Number(env.DEALS_REFRESH_DAYS || 7));
  if (!cc) return { skipped: "all countries are fresh" };
  return refreshCountry(env, cc);
}

export async function refreshCountry(env, cc) {
  const c = COUNTRIES[cc];
  if (!c || !env.ANTHROPIC_API_KEY) return { error: "not_configured" };

  // One refresh per country at a time.
  const lock = `lock:deals:${cc}`;
  if (await env.MENU_KV.get(lock)) return { skipped: "already running", country: cc };
  await env.MENU_KV.put(lock, "1", { expirationTtl: 900 });

  try {
    const found = await askClaude(env, cc);
    const clean = cleanDeals(found, cc);
    const count = Object.values(clean).reduce((a, l) => a + l.length, 0);

    const deals = await readDeals(env);
    // Replace this country's automatic deals; keep any posted by hand.
    for (const key of Object.keys(deals.stores)) {
      if (!key.startsWith(cc + "/")) continue;
      const manual = deals.stores[key].filter((d) => !d.auto);
      if (manual.length) deals.stores[key] = manual; else delete deals.stores[key];
    }
    for (const [store, list] of Object.entries(clean)) {
      const key = `${cc}/${store}`;
      deals.stores[key] = [...(deals.stores[key] || []), ...list];
    }
    const now = new Date();
    // "at" is when we really looked; "checked" drives when to look again.
    deals.countries[cc] = { at: now.toISOString(), checked: now.toISOString(), found: count };
    // A thin result is retried sooner (after a day) instead of waiting a week.
    if (count < 5) deals.countries[cc].checked = new Date(now.getTime() - (Number(env.DEALS_REFRESH_DAYS || 7) - 1) * DAY).toISOString();
    deals.updated = iso(now);
    await env.MENU_KV.put("deals", JSON.stringify(deals));
    console.log("deals refreshed", cc, count);
    return { country: cc, found: count };
  } catch (err) {
    console.error("deals refresh failed", cc, String(err));
    return { country: cc, error: String(err.message || err) };
  } finally {
    await env.MENU_KV.delete(lock);
  }
}

function dealsPrompt(cc) {
  const c = COUNTRIES[cc];
  const today = new Date();
  const stores = Object.entries(c.stores)
    .map(([s, card]) => `- ${s}${card ? ` (loyalty card: ${card})` : ""}`).join("\n");
  return `Find this week's supermarket promotions in ${c.name}. Today is ${iso(today)}.

SUPERMARKETS
${stores}

WHAT TO LOOK FOR
- Use web search: the stores' own weekly leaflet or promotions pages, and promo or leaflet sites for ${c.name}. Search in the local language.
- Only healthy everyday groceries someone would cook with: fresh fruit and vegetables, fish, meat, eggs, dairy, tofu, legumes, rice, pasta, grains, bread, frozen vegetables.
- Skip alcohol, soft drinks, sweets, snacks, ready meals, household and non-food items.
- Prefer the deals with the biggest saving and the best price per kilo. Up to 10 deals per store, and cover as many of the listed stores as you can find.

RULES
- Only include a deal you actually found in a source that is valid this week or next. Never guess or invent a price or a deal. If you found nothing for a store, leave it out.
- "price" is the promotional price in ${c.currency} as advertised for the pack, as a number. "was" is the regular price if the source shows it, otherwise omit it.
- "validFrom" and "validTo" are dates (YYYY-MM-DD) from the source. If only the end date is unknown, use ${iso(new Date(today.getTime() + 6 * DAY))}.
- "card": if the deal needs a loyalty card or app, use exactly the card name listed above; otherwise omit it.
- Keep product names as the shop writes them (local language is fine), with the pack size, e.g. "Zalmfilet 2 x 125 g".
- "source" is the URL where you found the deal.

Reply with ONLY this JSON, no other text:
{"stores": {"<store name exactly as listed above>": [{"item":"…","price":0.00,"was":0.00,"validFrom":"YYYY-MM-DD","validTo":"YYYY-MM-DD","card":"…","source":"https://…"}]}}`;
}

async function askClaude(env, cc) {
  const url = env.ANTHROPIC_URL || "https://api.anthropic.com/v1/messages";
  const messages = [{ role: "user", content: dealsPrompt(cc) }];
  let text = "";
  // Web search can pause a long turn; continue it a few times if needed.
  for (let round = 0; round < 4; round++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: env.DEALS_MODEL || env.MODEL || "claude-sonnet-5-5",
        max_tokens: 16000,
        thinking: { type: "between_tools" },
        output_config: { effort: "medium" },
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: Number(env.DEALS_MAX_SEARCHES || 6) }],
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const out = await res.json();
    text = (out.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    if (out.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: out.content });
  }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("no deals JSON in reply");
  return JSON.parse(text.slice(a, b + 1));
}

// Keep only well-formed deals for known stores, still valid, with a real source.
export function cleanDeals(found, cc) {
  const c = COUNTRIES[cc];
  const today = iso(new Date());
  const stores = Object.keys(c.stores);
  const cards = new Set(Object.values(c.stores).filter(Boolean));
  const out = {};
  for (const [name, list] of Object.entries(found?.stores || {})) {
    const store = stores.find((s) => s.toLowerCase() === String(name).toLowerCase());
    if (!store || !Array.isArray(list)) continue;
    const clean = list.map((d) => {
      const price = Number(d.price), was = Number(d.was);
      const item = String(d.item || "").trim().slice(0, 120);
      const source = /^https?:\/\//.test(d.source || "") ? String(d.source).slice(0, 400) : null;
      if (!item || !(price > 0) || price > 10000 || !source) return null;
      const validTo = isDate(d.validTo) ? d.validTo : null;
      if (validTo && validTo < today) return null;
      return {
        item, price: Math.round(price * 100) / 100,
        ...(was > price ? { was: Math.round(was * 100) / 100 } : {}),
        ...(isDate(d.validFrom) ? { validFrom: d.validFrom } : {}),
        ...(validTo ? { validTo } : {}),
        ...(d.card && cards.has(d.card) ? { card: d.card } : {}),
        source, auto: true,
      };
    }).filter(Boolean)
      // biggest saving first
      .sort((x, y) => ((y.was ? 1 - y.price / y.was : 0) - (x.was ? 1 - x.price / x.was : 0)))
      .slice(0, 12);
    if (clean.length) out[store] = clean;
  }
  return out;
}
