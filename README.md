# 🥕 The Menu

**A healthy weekly menu and shopping list, built around your supermarkets' deals.**

Pick your country, the supermarkets you shop at and the loyalty cards you have, set a budget and a few preferences, and The Menu plans seven days of meals around this week's promotions. It also gives you a shopping list split by store, with prices.

It started as my own weekly menu in Notion. I turned it into an app so friends could use it with their own stores and cards.

## What it does

- **Eight countries.** Belgium, France, Germany, Spain, Portugal, Switzerland, Mexico and the United Kingdom, each with its own supermarkets, loyalty cards, currency and local prices.
- **Your loyalty card at the till.** Add a card number in settings and its real barcode (EAN-13, EAN-8 or Code 128) is printed under that shop on the shopping list, ready to scan from your phone. No number, no barcode. Numbers never leave the browser.
- **Plans around real deals.** Each week I post the current promotions. Menus are built around them, and card-only deals are used only if you have that card.
- **Budget or quality.** Budget builds the week from promotions and skips bulk deals for one person. Quality still uses promotions but puts organic and good produce first, marked on the list.
- **Fits your week.** People, budget, which meals to plan, cooking time, diet, dislikes, and what's already in your fridge.
- **Chef's suggestion.** The week's key ingredients, why they're good for you, and a tip for making them taste great.
- **Shopping list.** Grouped by store and ticked off as you shop. Promo prices are exact; other prices are marked ≈. You can copy or print it.
- **No account needed.** Your settings and menu stay in your own browser.

## How it's built

| Part | Choice |
|---|---|
| Hosting | Cloudflare Workers with static assets, deployed from this repo on every push |
| Front end | Plain HTML, CSS and JavaScript, no framework or build step |
| Menu writing | Claude (Anthropic API), streamed so the page shows progress while it writes |
| Deals storage | Cloudflare KV |
| Loyalty barcodes | [JsBarcode](https://github.com/lindell/JsBarcode) (MIT), drawn in the browser |
| Spending guard | A daily limit per visitor and a daily limit overall, counted in KV |

The prompt is built on the server from validated settings, so the public endpoint can only write menus. It can't be used as a general AI proxy, and the API key never reaches the browser.

```
public/          the app (index.html, app.js, style.css)
src/worker.js    API: /api/menu, /api/deals, /admin
src/prompt.js    settings validation and the menu prompt
public/countries.js  countries, their supermarkets, loyalty cards and currency (shared by app and server)
src/admin.js     password-protected page for posting weekly deals
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

## Posting the weekly deals

Open `/admin`, enter the admin password, and type the deals. Each heading is a country code (BE, FR, DE, ES, PT, CH, MX, UK) and a store:

```
# BE Lidl
Salmon fillet 400 g; 4.99; 2026-11-19; Lidl Plus

# FR Carrefour
Jambon blanc 4 tranches; 2.15; 2026-11-19; Le Club Carrefour

# UK Tesco
Broccoli 350 g; 0.59; 2026-11-19; Tesco Clubcard
```

Each line is: product; price in that country's currency; valid until; loyalty card (optional).
Countries without deals still get menus, priced at typical local prices.

To add a country or a store, edit `public/countries.js`.

---

Made by Alix
