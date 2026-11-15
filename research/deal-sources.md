# Where to find each country's deals

Tested sources for the weekly deals research. The scheduled task reads this file
before every pull. Start with the sources marked **Works**, in the order listed.
Only fall back to general searching when they come back empty, and add anything
new that works (or stops working) to this file.

Last checked by hand: 14 Nov 2026, except where noted.

## How to reach pages

- WebFetch refuses many addresses typed by hand. Find the page with WebSearch
  first (pass `allowed_domains` with the source's domain), then fetch the result
  link. Links found inside a fetched page can be fetched directly.
- Ask the fetch for "every food offer with name, pack size, offer price, regular
  price and validity dates". If a page gives no dates, take them from the
  leaflet's dates on the same site.
- A deal only counts if its price was on a page you opened. Never estimate.

## Belgium (BE)

| Source | What it gives | Status |
|---|---|---|
| promotiez.be/winkels/<store>/folders-promoties | Each store's current and next folder, with dates and links to /bekijk/aanbiedingen/<store>-folder-<id> | Works |
| promotiez.be/bekijk/aanbiedingen/<store>-folder-<id> | Every product and price in that folder, folder dates | Works |
| promotiez.be/winkels/<store>/promoties | Current deals with regular price and % off; next week's show as "Vanaf morgen geldig" with no end date, over ~9 result pages (only page 1 fetches) | Works (15 Nov 2026) |
| promotiez.be/bekijk/aanbiedingen/carrefour-folder-<id> | Carrefour runs several overlapping folders (e.g. 11–23 and 18–30 Nov); check them all. Folder prices only, "Beste keuzes" box sometimes shows a regular price | Works (15 Nov 2026) |

Store slugs: lidl, aldi, delhaize, colruyt, carrefour, albert-heijn. Aldi folder URLs look like
/bekijk/aanbiedingen/aldi-folder-week-<n>-<id>. Folder pages give no pack sizes and rarely a
regular price. Delhaize's next folder can show captions without prices on Sunday: use the current one.
Timing: Lidl and Aldi run Monday–Saturday; Delhaize Thursday–Wednesday; Colruyt
two weeks from Wednesday. Lidl only shows next week's fresh-food deals from
Sunday. Every Delhaize promotion needs the SuperPlus card.

## France (FR)

| Source | What it gives | Status |
|---|---|---|
| promocatalogues.fr/magasins/<store> and /regardez/offres/… | Catalogues and individual offers with prices | Works (38 of 50 deals on 13 Nov) |
| promocatalogues.fr/magasins/<store>/catalogues-promotions | Each catalogue with dates and link; catalogue pages give names and offer prices but rarely pack size or regular price | Works (15 Nov 2026) |
| promocatalogues.fr/magasins/lidl/offres and /magasins/<store>/offres/<slug>-offre-<id>/ | Lidl offers with regular price and % off; single offer pages give pack size, regular price and exact dates | Works (new, 15 Nov 2026) |
| tiendeo.fr/<city>/<store> | A few "most clicked" products with prices, no per-item dates | Partial |

## Germany (DE)

| Source | What it gives | Status |
|---|---|---|
| discounto.de/Discounter/<store> (penny_markt, aldi, aldi_sued, lidl, norma) | That week's Prospekt offers with prices and dates | Works |
| discounto.de/Prospekte/<store>-<dates> | A whole Prospekt, e.g. REWE | Works |
| discounto.de/Discounter/<store>/Angebot-Datum:naechste-woche/ (REWE: /Supermarkt/REWE/Angebot-Datum:naechste-woche/) | Next week's offers with dates; little fresh food on Sundays | Works (new, 15 Nov 2026) |
| prospektangebote.de/angebote/<product> (hackfleisch, rinder-hackfleisch, hahnchen, hahnchenbrustfilet, lachsfilet, frische-eier, tomaten, apfel, brokkoli, schweine …) | Top-10 table: store, pack size, price, regular price, exact dates across stores. Only the dated table is reliable; other lists show relative times | Works (gave most DE deals, 15 Nov 2026) |
| prospektangebote.de/geschaefte/<store>/angebote | Relative dates only | Dead end (15 Nov 2026) |

Timing: most Prospekte run Monday–Saturday. On Sunday, discounto's next-week Prospekt pages
often show only teaser items (sweets, non-food) and PDF links.

## Switzerland (CH)

| Source | What it gives | Status |
|---|---|---|
| rappn.ch/en/offers/<store> (migros, coop, denner, lidl-switzerland, aldi-switzerland) | Per-store offers with price, regular price and end date (page 1 only). Reach via links on rappn.ch/en/compare-deals | Works (40 deals, 15 Nov 2026). Aldi page has no dates |
| rappn.ch/en/offers | Offers from Migros, Coop, Denner, Lidl, Aldi with prices, regular prices and dates | Fetch refused on 15 Nov 2026 (worked 13 Nov); use the per-store pages |
| rappn.ch/en/meat-deals-switzerland, /migros-deals-next-week-switzerland | Themed and next-week lists | Works |

Note: some Denner deals are priced per 100 g; scale them to the pack.
Timing: Migros/Coop/Denner/Lidl run Thursday–Wednesday; next week's deals are not on rappn on
Sunday, so a Sunday pull only covers Monday–Wednesday. Manor, Volg and Spar are not on rappn.

## Spain (ES)

| Source | What it gives | Status |
|---|---|---|
| radarsuper.com/folletos/<chain> (dia, carrefour, lidl, aldi, alcampo, ahorramas) | Up to 60 offers per chain with price, reference price and % off; leaflet dates on radarsuper.com/folletos | Works |
| radarsuper.com/folletos/mercadona | Weekly selection of Mercadona price drops | Works. Mercadona publishes no leaflet and runs almost no promotions |
| radarsuper.com/folletos/aldi | Leaflet dates only; no prices since June 2026 | Dead end (15 Nov 2026) |
| radarsuper.com/folletos/alcampo | Leaflet dates; only a few online-price offers, mostly not fresh food | Partial (15 Nov 2026) |
| radarsuper.com/folletos/lidl/provincia/<province> | Current leaflet's offers with prices; next leaflet's dates only, not its prices (Sunday) | Partial (15 Nov 2026) |
| tiendeo.com/<city>/<store> | Leaflet dates, only a handful of products | Partial |
| tiendeo.com/<city>/eroski, /consum | Leaflet dates only; no usable food prices | Dead end (15 Nov 2026) |
| tiendeo.com/Catalogos/<id> | — | Blocked (robots) |
| carrefour.es category pages | — | Blocked (fetch refused) |
| lidl.es weekly offer pages | Category links only, no prices | Dead end |

Timing: Lidl Monday–Sunday; Dia Wednesday–Tuesday; Carrefour irregular.

## Portugal (PT)

| Source | What it gives | Status |
|---|---|---|
| folhetos.pt/<store> (continente, lidl, aldi, pingo-doce) and /<store>/antevisao-folheto-…-<id> | Leaflet list with dates; leaflet pages give a text summary of highlights with prices and often regular prices (Lidl Plus marked). auchan and intermarche list pages are stale (October) | Works (new, 15 Nov 2026) |
| ocacapromocoes.pt/folheto-<store>-antevisao-promocoes-<dates>/ (tags: /tag/antevisao-folheto-auchan/, -intermarche/, -continente/) | Leaflet previews with 3–4 priced highlights, no regular prices; next week's Lidl out by Sunday. Only source found for Auchan and Intermarché | Works (new, 15 Nov 2026) |
| tiendeo.pt/<city>/lidl (e.g. vendas-novas) | Only ~7 "most clicked" products, from the leaflet ending Sunday; next week's not listed with products | Partial (15 Nov 2026) |
| tiendeo.pt/ofertas-catalogos/continente, /pingo-doce | Catalogue lists and dates | Works for dates |
| feed.continente.pt/folhetos/semanal-<week>-<year>-… | The whole weekly Continente leaflet as text, with prices and discounts (week 46 = 10–16 Nov, Tue–Mon) | Fetch not permitted on 15 Nov 2026 (worked before). Find the current week by searching "feed.continente.pt folhetos semanal" |
| continente.pt/frescos/com-desconto/ | "Página não encontrada" | Dead end (15 Nov 2026) |
| radarsuper.com/pt/folhetos/<chain> (continente) | Leaflet dates only; products only in images | Works for dates (new, 15 Nov 2026) |
| folhetos.pt/continente/… | Leaflet preview with dates and highlights | Works |

Timing: Lidl Monday–Sunday; Continente weekly Tuesday–Monday; Pingo Doce
weekly plus weekend leaflets.

## Netherlands (NL)

| Source | What it gives | Status |
|---|---|---|
| folderz.nl/winkels/<store>-folders.html (AH: folderz.nl/winkels/deen/locaties; Lidl: folderz.nl/winkels/lidl/locaties/best; Dirk: folderz.nl/winkels/dirk/locaties/amsterdam) | Each store's current and next folder, with dates and links to /bekijk/aanbiedingen/<store>-folder-<id> | Works |
| folderz.nl/bekijk/aanbiedingen/<store>-folder-<id> | Every product and price in that folder, folder dates (regular prices mostly missing). Find IDs with WebSearch (allowed_domains folderz.nl, "folderz <store> folder week <n>"). Vomar and Ekoplaza folder links are on folderz.nl/winkels/<store>/locaties/<city> (vomar: amsterdam, ekoplaza: utrecht) | Works (all 10 chains, 15 Nov 2026) |
| supermarktscanner.nl/<store>-aanbiedingen (dirk, albert-heijn, plus, jumbo, hoogvliet, dekamarkt) | Current deals with regular price, % off and end date | Works for Dirk (mostly canned/dry goods); other chains are often stale (check "Laatste prijs update"); AH and Jumbo updated 15 Nov but list almost no fresh food (15 Nov 2026) |
| folderz.nl/winkels/<store>/folders-aanbiedingen | — | Blocked (robots) |

Store slugs: albert-heijn, jumbo, lidl, aldi, plus, dirk, vomar, hoogvliet, dekamarkt, ekoplaza.
Timing: Albert Heijn, Lidl and Aldi run Monday–Sunday (Lidl to Saturday) and next
week's folder is online by Saturday. Plus, Jumbo, Dirk, Hoogvliet and DekaMarkt run
Wednesday–Tuesday; Plus is out by Saturday, Jumbo and Dirk often only on Sunday or
Monday. On a Sunday run, take this week's Wednesday folder for those chains if the
next one isn't out: its deals still cover Monday and Tuesday.
Albert Heijn Bonus prices need the AH Bonuskaart, so set "card" on every AH deal.
Skip AH "Mijn Bonus Box" offers: they are personal.

## Mexico (MX)

| Source | What it gives | Status |
|---|---|---|
| cazaofertas.com.mx (search "Martes de Frescura Walmart", "Martes y Miércoles del Campo Soriana", "Martimiércoles Chedraui", "Miércoles de Plaza La Comer") | Full fruit and vegetable price lists for each chain's produce days | Works |
| cazaofertas.com.mx (folletos, e.g. Soriana weekend leaflet) | Weekend leaflet prices | Works |
| cazaofertas.com.mx, cronica.com.mx, milenio.com (search "Alsuper martes y miércoles de frutas y verduras" + the date) | News write-ups of Alsuper's produce prices, when there are any | Not tested yet: try first for Alsuper |
| ofertomat.mx/alsuper/ and kimbino.mx/alsuper/ | Alsuper leaflet dates and product names; prices are only in the page images | Partial (dates only, 14 Nov). Never take a price you can't read |
| rappi.com.mx Alsuper stores | Delivery prices with % off, no dates | Dead end (app prices, not leaflet deals) |

Timing: produce promotions run only on Tuesday and/or Wednesday and are posted
the day before, so a Sunday pull finds last week's. Prices are per kg or per
piece; the deal's dates are those two days. Soriana deals marked "con puntos
Soriana Ya" need that card.
Alsuper (Chihuahua, Coahuila, Durango, Zacatecas) publishes two leaflets a week:
Friday–Monday and Tuesday–Thursday, the second one only on Tuesday morning, so a
Monday pull can only use the Friday–Monday one (valid on Monday). No loyalty card
found for Alsuper.

## United Kingdom (UK)

| Source | What it gives | Status |
|---|---|---|
| tesco.com/groceries/en-GB/shop/fresh-food/… category pages and /buylists/… | Clubcard Prices with regular price and "Offer valid … until …" dates | Works. Needs the Tesco Clubcard |
| tesco.com/groceries/en-GB/buylists/meat-fish-poultry/save-25-percent and /buylists/clubcard-prices/top-picks | More Clubcard Prices on meat and fish, with regular price and validity dates | Works (new, 15 Nov 2026) |
| sainsburys.co.uk … /fruit-vegetables-special-offers | Nectar Prices with the price without Nectar | Works (no dates). Needs Nectar. Link too long for WebFetch on 15 Nov 2026 |
| sainsburys.co.uk/groceries/browse/meat-and-fish/meat-and-fish-essentials/c:1020377/offer | Nectar Prices on meat and fish with regular price, no dates | Works (no dates, 15 Nov 2026) |
| corporate.sainsburys.co.uk press releases | Weekend Nectar Price events with dates | Works for dates |
| aldi.co.uk/super-6 | The six fruit and veg offers with regular price | Works (no dates; Super 6 changes every two weeks on Thursday) |
| leaflets.aldi.co.uk | Leaflet text with Super 6 dates | Works for dates |
| aldi.co.uk/leaflet/uk_week<n> (linked from aldi.co.uk/specialbuys/leaflet) | Weekly leaflet | Fetch not permitted (15 Nov 2026) |
| aldi.co.uk/super-weekly-offers | Pies and Christmas items, no dates | Dead end (15 Nov 2026) |
| lidl.co.uk Pick of the Week | Dates only; products are in the Lidl Plus app | Dead end |
| groceries.morrisons.com/promotions/fresh-foods/176739 | Dairy and deli meat offers, no dates or More Card labels, no fresh produce | Partial (no dates, 15 Nov 2026) |
| asda.com/groceries/price-drop/… | — | Fetch failed (15 Nov 2026) |

Most UK deals are loyalty-card prices, so set "card" on every one.
