// Fast checks with no dependencies. Cloudflare runs these as the build step
// (wrangler.jsonc → build.command), so a failing test stops the deploy.
//
//   npm test

import { readFileSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { COUNTRIES } from "../public/countries.js";
import { buildPrompt, cleanProfile, MENU_SCHEMA } from "../src/prompt.js";
import { cleanDeals, dealsFrom } from "../src/deals.js";
import { reconcile, findDeal } from "../public/reconcile.js";

let failed = 0, passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`✗ ${name}\n    ${e.message}`); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }
const root = new URL("../", import.meta.url);

// ---------- countries ----------
test("every country has a name, currency, budget, time zones and stores", () => {
  for (const [cc, c] of Object.entries(COUNTRIES)) {
    ok(c.name && /^[A-Z]{3}$/.test(c.currency), `${cc}: name or currency`);
    ok(c.budget > 0, `${cc}: budget`);
    ok(Array.isArray(c.timezones) && c.timezones.length, `${cc}: time zones`);
    ok(Object.keys(c.stores).length >= 3, `${cc}: stores`);
  }
});

// ---------- the deals database ----------
test("deals.json is well-formed: known stores, real prices, sources and dates", () => {
  const db = JSON.parse(readFileSync(new URL("public/data/deals.json", root), "utf8"));
  ok(db.stores && typeof db.stores === "object", "no stores");
  for (const [key, list] of Object.entries(db.stores)) {
    const [cc, store] = key.split("/");
    ok(COUNTRIES[cc]?.stores && store in COUNTRIES[cc].stores, `unknown store ${key}`);
    for (const d of list) {
      ok(typeof d.item === "string" && d.item, `${key}: item without a name`);
      ok(typeof d.price === "number" && d.price > 0, `${key}: ${d.item} has no price`);
      ok(/^https?:\/\//.test(d.source || ""), `${key}: ${d.item} has no source`);
      ok(!d.validTo || /^\d{4}-\d{2}-\d{2}$/.test(d.validTo), `${key}: ${d.item} bad date`);
    }
  }
});

test("deal sources file exists for the weekly research", () => {
  ok(existsSync(new URL("research/deal-sources.md", root)), "research/deal-sources.md missing");
});

// ---------- deals logic ----------
test("cleanDeals keeps only sourced, current deals for known stores", () => {
  const out = cleanDeals({
    Lidl: [
      { item: "Good", price: 1.5, was: 2, validTo: "2099-01-01", source: "https://x.be" },
      { item: "No source", price: 1 },
      { item: "Expired", price: 1, validTo: "2000-01-01", source: "https://x.be" },
      { item: "Free", price: 0, source: "https://x.be" },
    ],
    Nowhere: [{ item: "Unknown store", price: 1, source: "https://x.be" }],
  }, "BE", "2026-11-14");
  ok(Object.keys(out).join() === "Lidl", "wrong stores kept");
  ok(out.Lidl.length === 1 && out.Lidl[0].item === "Good", "wrong deals kept");
});

test("dealsFrom drops deals that end before the planned week", () => {
  const out = dealsFrom({ stores: { "BE/Lidl": [{ item: "a", validTo: "2026-11-15" }, { item: "b", validTo: "2026-11-16" }, { item: "c" }], "BE/Aldi": [{ item: "d", validTo: "2026-11-14" }] } }, "2026-11-16");
  ok(out.stores["BE/Lidl"].map((d) => d.item).join() === "b,c", "wrong Lidl deals");
  ok(!out.stores["BE/Aldi"], "empty store not removed");
});

test("the validator writes a clean database and keeps other countries", () => {
  const dir = mkdtempSync(join(tmpdir(), "deals-"));
  const out = join(dir, "deals.json"), research = join(dir, "research.json");
  writeFileSync(out, JSON.stringify({ stores: { "FR/Lidl": [{ item: "kept", price: 1, validTo: "2099-01-01", source: "https://x.fr" }] }, countries: { FR: { at: "x", found: 1 } } }));
  writeFileSync(research, JSON.stringify({ BE: { Lidl: [{ item: "Kip", price: 4, was: 6, validTo: "2099-01-01", source: "https://x.be" }, { item: "bad", price: 1 }] } }));
  execFileSync(process.execPath, [new URL("scripts/validate-deals.mjs", root).pathname, research], { env: { ...process.env, DEALS_OUT: out }, stdio: "pipe" });
  const db = JSON.parse(readFileSync(out, "utf8"));
  ok(db.stores["BE/Lidl"]?.length === 1, "BE deal not written");
  ok(db.stores["FR/Lidl"]?.[0].item === "kept", "FR deals not kept");
});

// ---------- the menu prompt ----------
const profile = cleanProfile({ country: "BE", stores: ["Lidl", "Nowhere"], cards: ["Lidl Plus"], people: 1, budget: 50, meals: ["Dinner"], priority: "budget" });
const deals = { stores: { "BE/Lidl": [{ item: "Zalmfilet", price: 3.99, was: 5.49, validTo: "2026-11-21", source: "https://x" }], "BE/Aldi": [{ item: "Not mine", price: 1, source: "https://x" }] } };
const prompt = buildPrompt(profile, ["Mon 16", "Tue 17"], deals, null);

test("cleanProfile drops unknown stores and keeps limits", () => {
  ok(profile.stores.join() === "Lidl", "unknown store kept");
  ok(cleanProfile({ people: 99, budget: 1e9 }).people === 8, "people not capped");
});
test("the prompt lists the days, the person's deals only, and the budget rules", () => {
  ok(prompt.includes("only these: Mon 16, Tue 17"), "days missing");
  ok(prompt.includes("Zalmfilet") && !prompt.includes("Not mine"), "wrong deals in prompt");
  ok(!prompt.includes("https://x"), "source links leaked into prompt");
  ok(prompt.includes("PRIORITY: BUDGET") && prompt.includes("one person"), "budget rules missing");
});
test("quality prompts don't demand staying under budget", () => {
  const q = buildPrompt(cleanProfile({ ...profile, priority: "quality" }), ["Mon 16"], deals, null);
  ok(q.includes("PRIORITY: QUALITY") && !q.includes("Stay under the budget"), "quality rules wrong");
});
test("change requests carry the current menu and the edits", () => {
  const c = buildPrompt(profile, ["Mon 16"], deals, { edits: "no salmon", previous: '{"days":[]}' });
  ok(c.includes('"no salmon"') && c.includes("THEIR CURRENT MENU"), "change block missing");
});

test("the menu schema requires every part the app reads", () => {
  ok(MENU_SCHEMA.required.join() === "mood,highlights,days,snack,shopping,notes", "top-level fields");
  const item = MENU_SCHEMA.properties.shopping.items.properties.items.items;
  ok(item.required.includes("price") && item.required.includes("promo"), "item fields");
  const walk = (s) => { if (s.type === "object") { ok(s.additionalProperties === false, "additionalProperties must be false"); Object.values(s.properties).forEach(walk); } if (s.items) walk(s.items); };
  walk(MENU_SCHEMA);
});

// ---------- promo checking ----------
test("promo items get their end date from the real deal; invented promos lose the mark", () => {
  const d = { stores: { "BE/Lidl": [{ item: "Gerookte Noorse zalm", price: 1.99, validTo: "2026-11-21" }] } };
  const plan = { shopping: [{ store: "Lidl", items: [
    { item: "Smoked salmon", deal: "Gerookte Noorse zalm", promo: true, until: "2026-12-01" },
    { item: "Made-up deal", promo: true, until: "2026-11-19" },
    { item: "Rice", promo: false },
  ] }] };
  reconcile(plan, d, "BE");
  const [a, b, c] = plan.shopping[0].items;
  ok(a.promo && a.until === "2026-11-21", "real deal not matched");
  ok(!b.promo && !b.until, "invented promo kept");
  ok(!c.promo, "regular item changed");
});
test("savings come only from deals with a regular price, times the packs bought", () => {
  const d = { stores: { "BE/Lidl": [{ item: "Zalmfilet", price: 3.99, was: 5.49 }, { item: "Paprika", price: 0.59 }] } };
  const plan = { shopping: [{ store: "Lidl", items: [
    { item: "Salmon", deal: "Zalmfilet", price: 7.98, promo: true },
    { item: "Peppers", deal: "Paprika", price: 0.59, promo: true },
  ] }] };
  reconcile(plan, d, "BE");
  const [a, b] = plan.shopping[0].items;
  ok(a.saved === 3, `two packs should save 3.00, got ${a.saved}`);
  ok(!b.saved, "saving invented without a regular price");
});
test("deals match by name even without the deal field", () => {
  ok(findDeal({ item: "Paprikamix 3 stuks" }, [{ item: "Paprikamix" }]), "no match");
  ok(!findDeal({ item: "Chicken" }, [{ item: "Kippenwokreepjes" }]), "false match");
});

// ---------- calendar file ----------
const { fold } = await import("../public/export.js");
test("long calendar lines are folded without breaking accents or emoji", () => {
  const line = "SUMMARY:Dinner: " + "Gratin dauphinois 🥔 à la crème fraîche, salade d'endives ".repeat(4);
  const parts = fold(line).split("\r\n");
  const enc = new TextEncoder();
  ok(parts.every((p) => enc.encode(p).length <= 75), "a line is longer than 75 bytes");
  ok(parts.slice(1).every((p) => p.startsWith(" ")), "continuation lines must start with a space");
  ok(parts.map((p, i) => (i ? p.slice(1) : p)).join("") === line, "folding changed the text");
});

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
