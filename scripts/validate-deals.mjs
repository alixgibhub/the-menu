// Checks and cleans the deals database before it's committed.
//
//   node scripts/validate-deals.mjs research.json
//
// research.json is what the scheduled task gathered, per country:
//   { "BE": { "Lidl": [ { "item", "price", "was"?, "validFrom"?, "validTo"?, "card"?, "source" } ] }, "FR": { … } }
//
// It keeps only well-formed, still-valid deals for known stores with a source URL,
// ranks them by saving, and writes public/data/deals.json. Countries missing from
// research.json keep their previous deals (if still valid), so one failed search
// never wipes a country. Prints a summary and exits non-zero if nothing usable was found.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { COUNTRIES } from "../public/countries.js";
import { cleanDeals } from "../src/deals.js";

const input = process.argv[2];
if (!input) { console.error("usage: node scripts/validate-deals.mjs research.json"); process.exit(2); }

const OUT = new URL("../public/data/deals.json", import.meta.url);
const research = JSON.parse(readFileSync(input, "utf8"));
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { stores: {}, countries: {} };
const now = new Date().toISOString();
const today = now.slice(0, 10);

const db = { updated: today, countries: {}, stores: {} };
let total = 0;
const summary = [];

for (const cc of Object.keys(COUNTRIES)) {
  const fresh = research[cc] ? cleanDeals(research[cc], cc, today) : null;
  const count = fresh ? Object.values(fresh).reduce((a, l) => a + l.length, 0) : 0;
  if (fresh && count > 0) {
    for (const [store, list] of Object.entries(fresh)) db.stores[`${cc}/${store}`] = list;
    db.countries[cc] = { at: now, found: count, stores: Object.keys(fresh).length };
    summary.push(`${cc}: ${count} deals in ${Object.keys(fresh).length} stores`);
  } else {
    // keep last time's deals that are still valid
    let kept = 0;
    for (const [key, list] of Object.entries(previous.stores || {})) {
      if (!key.startsWith(cc + "/")) continue;
      const live = list.filter((d) => !d.validTo || d.validTo >= today);
      if (live.length) { db.stores[key] = live; kept += live.length; }
    }
    if (previous.countries?.[cc]) db.countries[cc] = { ...previous.countries[cc], found: kept };
    summary.push(`${cc}: nothing new, kept ${kept} still-valid deals from last time`);
  }
  total += Object.entries(db.stores).filter(([k]) => k.startsWith(cc + "/")).reduce((a, [, l]) => a + l.length, 0);
}

writeFileSync(OUT, JSON.stringify(db, null, 1) + "\n");
console.log(summary.join("\n"));
console.log(`total: ${total} deals → public/data/deals.json`);
if (total === 0) process.exit(1);
