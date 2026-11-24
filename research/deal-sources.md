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
| promotiez.be/winkels/<store>/promoties | Current deals with regular price and % off; next week's show as "Vanaf morgen geldig" with no end date, over ~9 result pages (only page 1 fetches) . On a Wednesday it shows Colruyt's new folder ("13 dagen") with regular prices; ?page=2 links repeat page 1 | Works (18 Nov 2026) |
| promotiez.be/promoties/<keyword>/<store> (e.g. /promoties/pasta/colruyt) | A table per keyword: full product name with pack size, regular price, promo price, mechanism, start and end date. The best source for Colruyt. Find keyword pages with WebSearch (allowed_domains promotiez.be, e.g. "promotiez colruyt groenten promo"); try keywords like groenten, fruit, aardappelen, vlees, kip, gehakt, vis, zalm, kaas, yoghurt, eieren, brood, rijst, pasta, tofu, diepvriesgroenten. Only take rows whose end date is on or after Monday. On Wednesday Colruyt's keyword pages don't list the new folder yet (use the store promoties page and the folder); Delhaize's already list next week's rows (e.g. /promoties/avocado, /promoties/varkenshaasje) | Works (18 Nov 2026) |
| promotiez.be/bekijk/aanbiedingen/colruyt-folder-<id> | Only ~2 products per page in the captions, so a 30-page folder gives few fresh deals: use it to find the folder dates and product names, then the keyword pages for the rest | Partial (15 Nov 2026) |
| colruyt.be/nl/acties/vers, /acties/toppromo | Dates only; products load with JavaScript | Dead end (15 Nov 2026) |
| promotiez.be/bekijk/aanbiedingen/carrefour-folder-<id> | Carrefour runs several overlapping folders (e.g. 11–23 and 18–30 Nov); check them all. Folder prices only, "Beste keuzes" box sometimes shows a regular price | Works (15 Nov 2026) |
| promotiez.be/winkels/<store>/folders-promoties for albert-heijn, jumbo, carrefour-market, spar, intermarche (folder slug intermarchy-folder-<id>), okay | Next folders with dates: AH (Mon–Sun) and Jumbo, Carrefour Market (Wed–Tue) online on Sunday; Spar Thu–Wed (captions on pages 1–4 only); Okay two-week folder. Jumbo's "Beste keuzes" box shows regular prices | Works (new, 22 Nov 2026) |
| promotiez.be/winkels/lidl/promoties on Sunday | Still shows last week's ended deals (labelled "23 uur"); /promoties/<keyword>/lidl mostly not updated yet (only kippenborstfilet had next week). Use the Lidl folder instead | Partial (22 Nov 2026) |
| promotiez.be/bekijk/aanbiedingen/aldi-dy-pliant-<id> | Aldi's French folder alongside the Dutch one; sometimes captions extra items | Works (new, 22 Nov 2026) |
| promotiez.be/winkels/lidl/promoties/<name>-promotie-<id>/ | Single Lidl offer: pack size and mechanism | Works (new, 22 Nov 2026) |

Store slugs: lidl, aldi, delhaize, colruyt, carrefour, albert-heijn. Aldi folder URLs look like
/bekijk/aanbiedingen/aldi-folder-week-<n>-<id>. Folder pages give no pack sizes and rarely a
regular price. Delhaize's next folder can show captions without prices on Sunday: use the current one.
Timing: Lidl and Aldi run Monday–Saturday; Delhaize Thursday–Wednesday; Colruyt
two weeks from Wednesday. Colruyt's and Delhaize's next folders usually aren't online
on Sunday, so a Wednesday task tops up those two stores. Lidl only shows next week's fresh-food deals from
Sunday. Every Delhaize promotion needs the SuperPlus card.

## France (FR)

| Source | What it gives | Status |
|---|---|---|
| promocatalogues.fr/magasins/<store> and /regardez/offres/… | Catalogues and individual offers with prices | Works (38 of 50 deals on 13 Nov) |
| promocatalogues.fr/magasins/<store>/catalogues-promotions | Each catalogue with dates and link; catalogue pages give names and offer prices but rarely pack size or regular price | Works (15 Nov 2026) |
| promocatalogues.fr/magasins/lidl/offres and /magasins/<store>/offres/<slug>-offre-<id>/ | Lidl offers with regular price and % off; single offer pages give pack size, regular price and exact dates | Works (new, 15 Nov 2026) |
| tiendeo.fr/<city>/<store> | A few "most clicked" products with prices, no per-item dates | Partial |
| promocatalogues.fr/offres/<category>/<store-slug> (e.g. /offres/poulet/carrefour, /offres/saumon/super-u, /offres/viande/intermarche, /offres/porc/e-leclerc) | Best source for the big supermarkets: exact start/end dates, pack size, regular price when shown. Ask for rows valid on or after Monday (pages also list old offers). Find via WebSearch; hand-typed URLs failed | Works (new, 22 Nov 2026) |
| promocatalogues.fr catalogue pages for Carrefour, E.Leclerc, Intermarché and Lidl's next catalogue | Images only, no product text; use catalogues-promotions pages for dates only. /magasins/<store>/offres and /magasins/lidl/offres now show relative validity ("3 jours") instead of dates | Dead end for prices (22 Nov 2026) |
| promocatalogues.fr/offres/<category>/auchan | On Sunday only offers ending that day; retry midweek | Partial (22 Nov 2026) |

## Germany (DE)

| Source | What it gives | Status |
|---|---|---|
| discounto.de/Discounter/<store> (penny_markt, aldi, aldi_sued, lidl, norma) | That week's Prospekt offers with prices and dates | Works |
| discounto.de/Prospekte/<store>-<dates> | A whole Prospekt, e.g. REWE | Works |
| discounto.de/Discounter/<store>/Angebot-Datum:naechste-woche/ (REWE: /Supermarkt/REWE/Angebot-Datum:naechste-woche/) | Next week's offers with dates; little fresh food on Sundays | Works (new, 15 Nov 2026) |
| prospektangebote.de/angebote/<product> (hackfleisch, rinder-hackfleisch, hahnchen, hahnchenbrustfilet, lachsfilet, frische-eier, tomaten, apfel, brokkoli, schweine …) | Top-10 table: store, pack size, price, regular price, exact dates across stores. Only the dated table is reliable; other lists show relative times | Works (gave most DE deals, 15 Nov 2026) |
| prospektangebote.de/geschaefte/<store>/angebote | Relative dates only | Dead end (15 Nov 2026) |
| kaufda.de/insights/<store>-prospekt-<dd-mm-yyyy>-<slug>/ (WebSearch allowed_domains kaufda.de, "kaufda insights prospekt <Monday date>") | Articles on each new Prospekt with offer prices and dates, no regular prices; online on Sunday for Edeka, Rewe, Lidl, Aldi Süd/Nord, Penny, Netto. Only source found for Rewe and Edeka prices. Rate-limits: fetch one at a time | Works (new, 22 Nov 2026) |
| prospektangebote.de/angebote/<product> (update) | Now only 1–5 current deals per page; ask for both the Top table and "Preisverlauf". Had next-week rows: hackfleisch, hackfleisch-gemischt, rinder-hackfleisch, mohren, clementinen, hahnchenschenkel, lachs, speisequark, paprika, brokkoli, eier, markenbutter. Lidl rows dated "… – 31 Dec" are long-running price cuts. "Netto" there is the other Netto chain, not Marken-Discount | Works (22 Nov 2026) |
| discounto.de/Prospekte/Anbieter:<slug>/naechste-woche/ | Teasers and PDF link only; nothing for REWE, Edeka. Discounter next-week pages useful only for penny_markt (~40 offers) and aldi (Nord) on Sunday | Partial (22 Nov 2026) |
| prospektangebote.de/geschaefte/denn-s-biomarkt/prospekte-angebote | Leaflet dates only, no prices | Dead end (22 Nov 2026) |

Timing: most Prospekte run Monday–Saturday. On Sunday, discounto's next-week Prospekt pages
often show only teaser items (sweets, non-food) and PDF links.

## Switzerland (CH)

| Source | What it gives | Status |
|---|---|---|
| rappn.ch/en/offers/<store> (migros, coop, denner, lidl-switzerland, aldi-switzerland) | Per-store offers with price, regular price and end date (page 1 only). Reach via links on rappn.ch/en/compare-deals | Works (40 deals, 15 Nov 2026). Aldi page has no dates |
| rappn.ch/en/offers | Offers from Migros, Coop, Denner, Lidl, Aldi with prices, regular prices and dates | Fetch refused on 15 Nov 2026 (worked 13 Nov); use the per-store pages |
| rappn.ch/en/meat-deals-switzerland, /migros-deals-next-week-switzerland | Themed and next-week lists | Works |
| rappn.ch/en/offers/<store>/page/N | Page 2 adds meat, fish and fresh items for all four chains; Coop page 3 also useful, Migros page 3 non-food. Per-store pages show "valid until" per item, no start date | Works (new, 22 Nov 2026) |
| rappn.ch/en/lidl-deals-next-week-switzerland | Lidl's Monday-wave deals, start date but no end date | Partial (22 Nov 2026) |
| rappn.ch/en/grocery-deals-next-week-switzerland | Start days per chain only | Dead end (22 Nov 2026) |
| rappn.ch/en/offers/aldi-switzerland | No dates; data last checked 25 Sep 2026 | Dead end (22 Nov 2026) |

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
| radarsuper.com/folletos/<chain> (dia, carrefour, alcampo) | Offers are online-price drops with no per-item dates; take dates from the chain's leaflet. Few fresh items (Dia 5, Carrefour 9, Alcampo 2 usable) | Partial (22 Nov 2026) |
| radarsuper.com/folletos/mercadona, /folletos/dia on Sunday | Nothing dated from Monday yet: Mercadona selection still last week's; Dia's next leaflet (from Wednesday) has no contents | Partial (22 Nov 2026) |
| radarsuper.com/folletos/lidl/folleto-alimentacion-<dates>-<id> | Next Lidl leaflet page, linked from /folletos/lidl/provincia/<province>; not found by WebSearch and fetch not permitted | Untested (22 Nov 2026) |
| radarsuper.com (Eroski, Consum) | No folleto pages found | Dead end (22 Nov 2026) |

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
| folhetos.pt/aldi/antevisao-folheto-aldi-promocoes-de-<dates>-<id> | Aldi highlights with offer and regular prices; next week out by Sunday | Works (22 Nov 2026) |
| folhetos.pt/<store>/<leaflet>/2 … /7 | Page images only, no text prices | Dead end (22 Nov 2026) |
| ocacapromocoes.pt/category/folhetos/ | Latest leaflet posts with dates, to spot new leaflets. URLs without a year can be old (check the date). Tag pages: fetch not permitted | Works (new, 22 Nov 2026) |
| feed.continente.pt/folhetos/semanal-50-2025-v4rt | Fetchable; links to the current week's leaflet, which itself was not fetchable | Partial (22 Nov 2026) |

Timing: Lidl Monday–Sunday; Continente weekly Tuesday–Monday; Pingo Doce
weekly plus weekend leaflets.

## Netherlands (NL)

| Source | What it gives | Status |
|---|---|---|
| folderz.nl/winkels/<store>-folders.html (AH: folderz.nl/winkels/deen/locaties; Lidl: folderz.nl/winkels/lidl/locaties/best; Dirk: folderz.nl/winkels/dirk/locaties/amsterdam) | Each store's current and next folder, with dates and links to /bekijk/aanbiedingen/<store>-folder-<id> | Works |
| folderz.nl/bekijk/aanbiedingen/<store>-folder-<id> | Every product and price in that folder, folder dates (regular prices mostly missing). Find IDs with WebSearch (allowed_domains folderz.nl, "folderz <store> folder week <n>"). Vomar and Ekoplaza folder links are on folderz.nl/winkels/<store>/locaties/<city> (vomar: amsterdam, ekoplaza: utrecht) | Works (all 10 chains, 15 Nov 2026) |
| supermarktscanner.nl/<store>-aanbiedingen (dirk, albert-heijn, plus, jumbo, hoogvliet, dekamarkt) | Current deals with regular price, % off and end date | Works for Dirk (mostly canned/dry goods); other chains are often stale (check "Laatste prijs update"); AH and Jumbo updated 15 Nov but list almost no fresh food (15 Nov 2026) |
| folderz.nl/winkels/<store>/folders-aanbiedingen | — | Blocked (robots) |
| folderz.nl/bekijk/aanbiedingen/<store>-folder-<id> on Sunday | Next week's folders for all 10 chains online by Sunday 22 Nov (incl. Wed–Tue chains); captions give names and prices but rarely pack size, regular price or multi-buy mechanism; many AH captions have no price | Works, partial detail (22 Nov 2026) |
| folderz.nl/winkels/ekoplaza/locaties/amstelveen | Ekoplaza folder links plus a few offers with pack size, % off and mechanism | Works (new, 22 Nov 2026) |
| folderz.nl/winkels/<store>/aanbiedingen | Pack size and regular price, but on Sunday only the ending week's offers, no dates | Partial (22 Nov 2026) |

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
| cazaofertas.com.mx (search "Martes de Frescura Walmart", "Martes y Miércoles del Campo Soriana", "Martimiércoles Chedraui", "Miércoles de Plaza La Comer") | Full fruit and vegetable price lists for each chain's produce days | Works (but the 24 Nov 2026 article pages returned a server error on fetch; fall back to ejecentral.com.mx) |
| cazaofertas.com.mx (folletos, e.g. Soriana weekend leaflet) | Weekend leaflet prices | Works |
| cazaofertas.com.mx, cronica.com.mx, milenio.com (search "Alsuper martes y miércoles de frutas y verduras" + the date) | News write-ups of Alsuper's produce prices, when there are any | Not tested yet: try first for Alsuper |
| ofertomat.mx/alsuper/ and kimbino.mx/alsuper/ | Alsuper leaflet dates and product names; prices are only in the page images | Partial (dates only, 14 Nov). Never take a price you can't read |
| rappi.com.mx Alsuper stores | Delivery prices with % off, no dates | Dead end (app prices, not leaflet deals) |
| razon.com.mx (search "Martes de frescura Walmart" / "Martimiércoles de Chedraui" + the date) | Item-by-item Walmart and Chedraui produce-day prices, published Monday evening | Works (new, 17 Nov 2026) |
| ruptura360.mx | Walmart/Chedraui produce-day write-ups | Partial: mixes in "projected" prices, use only to cross-check (17 Nov 2026) |
| informabtl.com "Lista completa de descuentos" articles | Prices published Sunday that the articles call estimates | Dead end: estimated prices, never use (16 Nov 2026) |
| cazaofertas.com.mx "Bodega Aurrera Tianguis de frutas y verduras Precio Bodega al <date>" | Bodega Aurrera fruit, veg, meat and fish prices in the page text (no regular prices), weekly Friday–Thursday; a second block is priced for Insurgentes CDMX only | Works (new, 23 Nov 2026) |
| cazaofertas.com.mx folletos for HEB weekly, La Comer Navifans, Sam's Club cuponera, Soriana Híper weekly | Dates only; food prices are only in the leaflet images | Partial (dates only, 23 Nov 2026) |
| ejecentral.com.mx (search "Martes y Miércoles del Campo Soriana" / "Martimiércoles Chedraui" / "Martes de Frescura Walmart" + the date) | Full Soriana list with "antes" prices; Chedraui and Walmart lists without regular prices, published Monday ~12:00–14:00 CDMX. Chedraui/Walmart pages had some garbled units and duplicate items: skip those | Works (new, 24 Nov 2026) |
| ambito.com/mexico (search "Las ofertas del Martes de Frescura" / "Martes y Miércoles del Campo") | First 5–6 items only, rest behind a paywall | Partial (24 Nov 2026) |
| informador.mx "Frescura en Walmart: Ofertas del …" | Weekly Walmart Frescura list with prices, no regular prices; AI-written with inconsistent dates | Partial: cross-check only (23 Nov 2026) |

Timing: produce promotions run only on Tuesday and/or Wednesday and are posted
the day before (Monday evening; on a holiday Monday cazaofertas was still
empty at noon and only partial at 21:00), so a Sunday pull finds last week's. At 12:45 Mexico City time on Monday 23 Nov 2026 search didn't find any of the
Tuesday/Wednesday lists yet, though ejecentral had posted them at 12:00–14:00,
so run after about 15:00 Mexico City time. No La Comer Miércoles de Plaza list was found by 20:00. Since Aug 2026 Walmart is moving from
Martes de Frescura to "Frescura todos los días" (merca20, 4 Aug 2026); write-ups
now present it as a 7-day Tuesday–Monday list. Prices are per kg or per
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
| tesco.com/groceries/en-GB/buylists/fresh-fruit-and-vegetables/top-offers, /buylists/seasonal-fruit-and-vegetables/fresh-5 and /seasonal-fruit | Clubcard Prices on fruit and veg with regular price and dates | Works (new, 22 Nov 2026) |
| tesco.com/shop/en-GB/buylists/clubcard-prices/fresh/* subpages | All repeat the same ~11 meat/fish items; meat-and-fish/top-offers, fridge-fillers and bakery copies were stale | Partial (22 Nov 2026) |
| waitrose.com/ecom/shop/browse/offers/fresh_and_chilled_offers, iceland.co.uk/offers/fresh-offers, groceries.morrisons.com/promotions | Offer and was prices but no dates | Partial (no dates, 22 Nov 2026) |
| leaflets.aldi.co.uk, groceries.aldi.co.uk/en-GB/Super-6, aldipresscentre.co.uk | No 2026 Super 6 dates found (press centre only had the Festive Super Six) | Dead end for dates (22 Nov 2026) |
| marksandspencer.com/c/sparks/sparks-prices | Stale copy (June–July) | Dead end (22 Nov 2026) |
| coop.co.uk/products/deals/member-prices | Bot-check page | Blocked (22 Nov 2026) |
| lidl.co.uk/c/food-offers/… | Banners only | Dead end (22 Nov 2026) |

Most UK deals are loyalty-card prices, so set "card" on every one.
