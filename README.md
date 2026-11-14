# 🥕 The Menu

**A healthy weekly menu and shopping list, built around your supermarkets' deals.**

Pick your country, the supermarkets you shop at and the loyalty cards you have, set a budget and a few preferences, and The Menu plans your week of meals around this week's promotions. It also gives you a shopping list split by store, with prices.

It started as my own weekly menu in Notion. I turned it into an app so friends could use it with their own stores and cards.

## What it does

- **Nine countries.** Belgium, the Netherlands, France, Germany, Spain, Portugal, Switzerland, Mexico and the United Kingdom, each with its own supermarkets, loyalty cards, currency and local prices.
- **Finds the deals by itself.** Every week scheduled Claude tasks research every country's supermarket promotions on healthy everyday groceries for the coming week, keeps only deals with a real source, ranks them by saving and saves them to the deals database in this repo. Menus are built around the biggest savings, and card-only deals are used only if you have that card.
- **Budget or quality.** Budget builds the week from promotions and skips bulk deals for one person. Quality still uses promotions but puts organic and good produce first, marked on the list.
- **One fixed week.** A menu covers Monday to Sunday and doesn't change halfway through; from Friday on, it plans the coming week. New deals arrive on Sunday; a banner on the menu and the shopping list says so, and warns you to shop early if a promo price ends mid-week.
- **Fits your week.** People, budget, which days and meals to plan, cooking time, diet, dislikes, and what's already in your fridge.
- **Chef's picks.** Three words for the week, its key ingredients, and a chef's tip on preparing each one for the most flavour.
- **Shopping list.** Its own tab, with this week's deals underneath. Grouped by store and ticked off as you shop. Promo prices are exact; other prices are marked ≈. You can copy or print it.
- **Change anything.** *Change something* under the chef's picks reprints the whole week: swap or drop a key ingredient and every meal, the shopping list and the prices follow. Each day receipt also has its own *Change this day* box.
- **Take it with you.** Export to Notes (the phone's share sheet: Apple Notes, Google Keep, Samsung Notes), Calendar (an .ics file with every meal; on Android, one Google Calendar link per day) or Notion (copied as Markdown, so headings and to-do checkboxes paste straight in).
- **No account needed.** Your settings and menu stay in your own browser.

## How it's built

| Part | Choice |
|---|---|
| Hosting | Cloudflare Workers with static assets, deployed from this repo on every push |
| Front end | Plain HTML, CSS and JavaScript, no framework or build step |
| Menu writing | Claude (Anthropic API), streamed so the page shows progress while it writes |
| Deals | `public/data/deals.json`, researched weekly by scheduled Claude tasks and committed to this repo |
| Spending guard | A daily limit per visitor and a daily limit overall, counted in KV |

The prompt is built on the server from validated settings, so the public endpoint can only write menus. It can't be used as a general AI proxy, and the API key never reaches the browser.

```
public/index.html, app.js, style.css   the app
public/export.js                       Notes, Calendar and Notion exports
public/countries.js                    countries, supermarkets, loyalty cards, currency (shared by app and server)
public/data/deals.json                 the deals database
src/worker.js                          API: /api/menu, /api/deals, /api/calendar, /admin
src/prompt.js                          settings validation and the menu prompt
src/deals.js                           reads the deals (database + your own) and cleans research
src/admin.js                           password-protected page: research status, your own deals
public/reconcile.js                    checks each promo item against the real deals
tests/                                 unit tests (run before every deploy) and browser tests
scripts/validate-deals.mjs             checks research before it's committed
research/deal-sources.md               tested deal sources per country, read by the weekly research
wrangler.jsonc                         Cloudflare configuration
```

## Running it yourself

1. `npm install`
2. Create a `.dev.vars` file:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ADMIN_TOKEN=choose-a-password
   ```
3. `npm run dev` and open http://localhost:8787

Deploy with `npm run deploy`, or connect the repo in the Cloudflare dashboard (Workers → Create → Import a repository). Add `ANTHROPIC_API_KEY` and `ADMIN_TOKEN` as secrets under the Worker's Settings → Variables and Secrets. To change the KV namespace id or the daily limits, edit `wrangler.jsonc`.

## Tests

- `npm test` runs fast checks on the deals database, the menu prompt, the menu schema and the promo matching. Cloudflare runs them before every deploy (`build.command` in `wrangler.jsonc`), so a failing test, or a broken `deals.json`, stops the deploy and the live app stays as it was.
- `npm run test:e2e` starts a local copy of the app with a stand-in for Claude and clicks through it in a browser: printing, the shopping list tab, ticks, changes, exports, the planned week, and what happens when Claude's reply is rejected or empty. Needs Python 3 with Playwright.

## Deals

The deals database is [`public/data/deals.json`](public/data/deals.json). Three scheduled Claude tasks keep it fresh, each timed to when its countries' leaflets come out:

| When (Brussels time) | Countries | Why then |
|---|---|---|
| Sunday 05:34 | Belgium, France, Germany, Switzerland | Next week's leaflets are out |
| Sunday 06:47 | Spain, Portugal, UK, Netherlands | Same, plus multi-week loyalty prices; Dutch Wednesday chains are often out by then |
| Monday 19:41 | Mexico | Tuesday and Wednesday produce deals are posted on Monday |

Each task researches its countries from the tested sources in [`research/deal-sources.md`](research/deal-sources.md) (and updates that file when a source breaks or a new one works), keeps only deals with a real source, checks the result with `scripts/validate-deals.mjs` (drops junk and expired deals, ranks by saving, leaves other countries alone) and `npm test`, and commits it here. Cloudflare redeploys on every push, so new menus use the new deals straight away; menus already printed don't change.

On `/admin` (password: `ADMIN_TOKEN`) you can see when each country was last researched and add your own deals on top:

```
# BE Lidl
Salmon fillet 400 g; 4.99; 2026-11-19; Lidl Plus
```

Each line is: product; price in that country's currency; valid until; loyalty card (optional).

To add a country or a store, edit `public/countries.js`.

---

Made by Alix
