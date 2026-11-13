# 🥕 The Menu

**A healthy weekly menu and shopping list, built around your supermarkets' deals.**

Pick your country, the supermarkets you shop at and the loyalty cards you have, set a budget and a few preferences, and The Menu plans seven days of meals around this week's promotions. It also gives you a shopping list split by store, with prices.

It started as my own weekly menu in Notion. I turned it into an app so friends could use it with their own stores and cards.

## What it does

- **Eight countries.** Belgium, France, Germany, Spain, Portugal, Switzerland, Mexico and the United Kingdom, each with its own supermarkets, loyalty cards, currency and local prices.
- **Your loyalty card at the till.** Add a card number in settings and its real barcode (EAN-13, EAN-8 or Code 128) is printed under that shop on the shopping list, ready to scan from your phone. No number, no barcode. Numbers never leave the browser.
- **Finds the deals by itself.** Every week, for each country, Claude searches the supermarkets' leaflets and promo sites for this week's promotions on healthy everyday groceries, keeps only deals it found in a real source, and ranks them by saving. Menus are built around the biggest savings, and card-only deals are used only if you have that card.
- **Budget or quality.** Budget builds the week from promotions and skips bulk deals for one person. Quality still uses promotions but puts organic and good produce first, marked on the list.
- **Fits your week.** People, budget, which meals to plan, cooking time, diet, dislikes, and what's already in your fridge.
- **Chef's suggestion.** The week's key ingredients, why they're good for you, and a tip for making them taste great.
- **Shopping list.** Grouped by store and ticked off as you shop. Promo prices are exact; other prices are marked ≈. You can copy or print it.
- **Change anything.** Every day receipt has its own *Change this day* box, and the groceries list has *Change something* for the whole week. The menu is reprinted with only those changes.
- **Take it with you.** Export to Notes (the phone's share sheet: Apple Notes, Google Keep, Samsung Notes), Calendar (an .ics file with every meal; on Android, one Google Calendar link per day) or Notion (copied as Markdown, so headings and to-do checkboxes paste straight in).
- **No account needed.** Your settings and menu stay in your own browser.

## How it's built

| Part | Choice |
|---|---|
| Hosting | Cloudflare Workers with static assets, deployed from this repo on every push |
| Front end | Plain HTML, CSS and JavaScript, no framework or build step |
| Menu writing | Claude (Anthropic API), streamed so the page shows progress while it writes |
| Deals | Found weekly by Claude with web search, on an hourly Cloudflare Cron Trigger that refreshes the most overdue country; stored in Cloudflare KV |
| Loyalty barcodes | [JsBarcode](https://github.com/lindell/JsBarcode) (MIT), drawn in the browser |
| Spending guard | A daily limit per visitor and a daily limit overall, counted in KV |

The prompt is built on the server from validated settings, so the public endpoint can only write menus. It can't be used as a general AI proxy, and the API key never reaches the browser.

```
public/          the app (index.html, app.js, style.css)
src/worker.js    API: /api/menu, /api/deals, /admin
src/prompt.js    settings validation and the menu prompt
public/countries.js  countries, their supermarkets, loyalty cards and currency (shared by app and server)
src/deals.js     weekly automatic deal finding (Claude + web search)
src/admin.js     password-protected page: deal status, fetch now, your own deals
public/export.js     Notes, Calendar and Notion exports
wrangler.jsonc   Cloudflare configuration
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

## Deals

Deals are found automatically. Once an hour the Worker checks which country's deals are oldest, and if they're more than a week old, Claude searches that country's supermarket leaflets and promo sites and returns the deals it found, each with its source link. Junk is filtered out (no source, expired, unknown store, non-food), and the rest replaces that country's previous automatic deals. A country with very few results is retried the next day.

On `/admin` (password: `ADMIN_TOKEN`) you can see when each country was last checked, fetch a country's deals right away, and add your own deals on top, which are never overwritten:

```
# BE Lidl
Salmon fillet 400 g; 4.99; 2026-11-19; Lidl Plus
```

Each line is: product; price in that country's currency; valid until; loyalty card (optional).

Cost: roughly $0.15–0.30 per country per week for the searches and tokens, so about $5–10 a month for all eight countries. Tune it with `DEALS_REFRESH_DAYS` and `DEALS_MAX_SEARCHES` in `wrangler.jsonc`.

To add a country or a store, edit `public/countries.js`.

---

Made by Alix
