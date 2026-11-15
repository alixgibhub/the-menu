import { COUNTRIES, DEFAULT_COUNTRY } from "/countries.js";
import { device, menuText, menuICS, googleDayLinks, openICS, download } from "/export.js";
import { reconcile } from "/reconcile.js";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const DIETS = ["Vegetarian", "Pescatarian", "Vegan", "Lactose-free", "Gluten-free", "No pork", "High protein"];
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ERRORS = {
  daily_limit: "You've made today's menus. Come back tomorrow for a fresh one.",
  daily_limit_all: "The Menu is very popular today and has reached its daily limit. Try again tomorrow.",
  busy: "The chef is busy right now. Try again in a minute.",
  too_long: "That menu came out too long to print. Try again, or plan fewer meals.",
  not_configured: "Menu writing isn't switched on yet.",
  no_stores: "Pick at least one supermarket in your settings first.",
};
const FAILED = "Something went wrong writing the menu. Try again.";

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const country = () => COUNTRIES[profile.country] || COUNTRIES[DEFAULT_COUNTRY];
const storesFor = (cc) => Object.keys(COUNTRIES[cc].stores);
const fmt = (n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: country().currency }).format(+n || 0);
const money = fmt;                                                // €12.50, £12.50, CHF 12.50, MX$120.00
const num = (n) => fmt(n).replace(/[^0-9.,]/g, "");               // just the number, for receipt columns
const symbol = () => fmt(0).replace(/[0-9.,\s]/g, "") || country().currency;
const sumPrices = (items) => (items || []).reduce((a, i) => a + (+i.price || 0), 0);

// Settings and menu live in this browser only.
const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem("themenu:" + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem("themenu:" + k, JSON.stringify(v)); } catch {} },
};
// Card numbers from the old barcode feature: don't keep them on the device.
try { localStorage.removeItem("themenu:cardNumbers"); } catch {}

// ---------- dates ----------
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s) => new Date(s + "T00:00:00");
const dayName = (d) => WEEK[(d.getDay() + 6) % 7];
const shortDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const longDay = (d) => d.toLocaleDateString("en-GB", { weekday: "long" });
const dayMonth = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

// A menu covers one fixed week, Monday to Sunday. From Friday on, most of
// this week is gone, so we plan the coming week; Monday to Thursday, this week.
export function weekDays(now = new Date()) {
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  const dow = t.getDay(); // 0 = Sunday
  const mon = new Date(t); mon.setDate(t.getDate() + (dow === 0 ? 1 : dow >= 5 ? 8 - dow : 1 - dow));
  return WEEK.map((_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}

// ---------- state ----------
function guessCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (const [cc, c] of Object.entries(COUNTRIES)) if (c.timezones.includes(tz)) return cc;
  } catch {}
  return DEFAULT_COUNTRY;
}
const startFor = (cc) => ({ country: cc, stores: storesFor(cc).slice(0, 2), cards: [], budget: COUNTRIES[cc].budget });
const defaults = {
  ...startFor(guessCountry()), otherCards: "", people: 1, meals: MEALS.slice(), weekdays: WEEK.slice(),
  cookTime: "normal", priority: "budget", diet: [], dislikes: "", fridge: "",
};
let profile = { ...defaults, ...(LS.get("profile") || {}) };
profile.stores = profile.stores.filter((s) => s in country().stores);
// {weekLabel, start, dates, made, plan, checked}; menus saved before dates were stored are dropped
let menu = LS.get("menu");
if (!menu?.plan || !Array.isArray(menu.dates)) menu = null;
let deals = null;  // {updated, countries, stores: {"CC/Store": [...]}}
// Loyalty card numbers never join the profile, so they never leave this browser.

// ---------- tabs ----------
const VIEWS = ["menu", "list", "settings"];
function show(v) {
  VIEWS.forEach((n) => { $("view-" + n).classList.toggle("hidden", n !== v); $("tab-" + n).classList.toggle("on", n === v); });
}
VIEWS.forEach((n) => ($("tab-" + n).onclick = () => show(n)));

// ---------- settings ----------
function chips(el, options, selected, onChange, label = (o) => o) {
  el.innerHTML = "";
  options.forEach((o) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "chip", textContent: label(o) });
    b.classList.toggle("on", selected().includes(o));
    b.onclick = () => onChange(o, b);
    el.appendChild(b);
  });
}
// A multi-select chip group bound to profile[key].
function toggles(el, options, key, after) {
  chips(el, options, () => profile[key], (o, b) => {
    profile[key] = b.classList.toggle("on") ? [...profile[key], o] : profile[key].filter((x) => x !== o);
    after?.();
  });
}

function renderCards() {
  const opts = [...new Set(profile.stores.map((s) => country().stores[s]).filter(Boolean))];
  profile.cards = profile.cards.filter((c) => opts.includes(c));
  toggles($("cardChips"), opts, "cards");
  if (!opts.length) $("cardChips").innerHTML = '<span class="note">Pick a supermarket first.</span>';
}

function renderSettings() {
  chips($("countryChips"), Object.keys(COUNTRIES), () => [profile.country], (cc) => {
    if (cc === profile.country) return;
    readSettings();
    Object.assign(profile, startFor(cc));   // new country: its own shops, cards and budget
    renderSettings(); renderDeals();
  }, (cc) => COUNTRIES[cc].name);
  const choices = $$("#priorityChoices .choice");
  const markPriority = () => choices.forEach((c) => c.classList.toggle("on", c.dataset.priority === profile.priority));
  choices.forEach((b) => (b.onclick = () => { profile.priority = b.dataset.priority; markPriority(); }));
  markPriority();
  toggles($("storeChips"), storesFor(profile.country), "stores", renderCards);
  renderCards();
  toggles($("mealChips"), MEALS, "meals");
  toggles($("dayChips"), WEEK, "weekdays", () => (profile.weekdays = WEEK.filter((d) => profile.weekdays.includes(d))));
  toggles($("dietChips"), DIETS, "diet");
  $("budgetLabel").textContent = `Weekly budget (${symbol()})`;
  for (const k of ["otherCards", "people", "budget", "cookTime", "dislikes", "fridge"]) $(k).value = profile[k];
}
function readSettings() {
  for (const k of ["otherCards", "cookTime", "dislikes", "fridge"]) profile[k] = $(k).value.trim();
  profile.people = Math.max(1, Math.min(8, parseInt($("people").value) || 1));
  profile.budget = Math.max(1, parseFloat($("budget").value) || country().budget);
}

$("saveBtn").onclick = () => {
  readSettings();
  if (!profile.stores.length) { $("saveMsg").textContent = "Pick at least one supermarket."; return; }
  if (!profile.weekdays.length) { $("saveMsg").textContent = "Pick at least one day."; return; }
  LS.set("profile", profile);
  $("saveMsg").textContent = "Saved ✓";
  renderEmptyText();
  setTimeout(() => { $("saveMsg").textContent = ""; show("menu"); }, 900);
};

// ---------- deals ----------
const saving = (x) => (x.was > x.price ? Math.round((1 - x.price / x.was) * 100) : 0);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "link"; } };

function renderDeals() {
  // The server already dropped expired deals; keep this country's stores.
  const prefix = profile.country + "/";
  const stores = Object.entries(deals?.stores || {}).filter(([k]) => k.startsWith(prefix));
  const info = deals?.countries?.[profile.country];
  if (!stores.length) {
    $("dealsIntro").textContent = info
      ? `No promotions found for ${country().name} this week yet. Menus use typical local prices, marked ≈.`
      : `The Menu is looking up this week's promotions for ${country().name}. Check back soon. Meanwhile menus use typical local prices, marked ≈.`;
    $("dealsOut").innerHTML = "";
    return;
  }
  const checked = info?.at ? dayMonth(new Date(info.at)) : deals.updated;
  $("dealsIntro").textContent = `This week's best promotions from the supermarkets' leaflets${checked ? `, checked ${checked}` : ""}. New deals arrive every Sunday, and your menu is built around them.`;
  $("dealsOut").innerHTML = stores.map(([key, list]) => {
    list = list.slice().sort((a, b) => saving(b) - saving(a));
    // one link per website
    const sources = [...new Map(list.filter((x) => x.source).map((x) => [host(x.source), x.source])).values()].slice(0, 3);
    return `
      <p class="store-name">*** ${esc(key.slice(prefix.length))} ***</p>
      <table class="deals"><tr><th>Product</th><th>Price</th><th>Until</th></tr>
      ${list.map((x) => `<tr>
        <td>${esc(x.item)}${x.card ? `<span class="stamp">${esc(x.card)}</span>` : ""}${saving(x) ? `<span class="stamp bio">−${saving(x)}%</span>` : ""}</td>
        <td>${money(x.price)}${x.was ? `<br><s class="was">${money(x.was)}</s>` : ""}</td>
        <td>${x.validTo ? esc(x.validTo.slice(8) + "/" + x.validTo.slice(5, 7)) : "—"}</td></tr>`).join("")}
      </table>
      ${sources.length ? `<p class="sources">Source: ${sources.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(host(u))}</a>`).join(", ")}</p>` : ""}`;
  }).join("");
}
async function loadDeals() {
  try { deals = await (await fetch("/api/deals")).json(); } catch { deals = null; }
  renderDeals();
}

// ---------- make a menu ----------
function renderEmptyText(msg) {
  $("emptyText").textContent = msg || (profile.stores.length
    ? `${country().name} · ${profile.priority === "quality" ? "quality first" : "budget first"} · shopping at ${profile.stores.join(", ")}. Budget ${money(profile.budget)} for ${profile.people} ${profile.people > 1 ? "people" : "person"}.`
    : "Set your supermarkets and preferences first, then make your week.");
}

let busy = false;
// edits: optional text saying what to change in the current menu
async function makeMenu(edits = "") {
  if (busy) return;
  if (!profile.stores.length) { show("settings"); return; }
  busy = true;
  const week = weekDays();
  const days = week.filter((d) => profile.weekdays.includes(dayName(d)));
  const body = { profile, days: days.map((d) => `${dayName(d)} ${d.getDate()}`), start: iso(days[0]) };
  if (edits && menu) Object.assign(body, { edits, previous: menu.plan });

  show("menu");
  $("menuEmpty").classList.add("hidden"); $("menuOut").classList.add("hidden"); $("progress").classList.remove("hidden");
  $("progressText").textContent = edits ? "Reprinting with your changes…" : "Printing your week…";
  $$(".makeBtn").forEach((b) => (b.disabled = true));
  try {
    const res = await fetch("/api/menu", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw { code: (await res.json().catch(() => ({}))).error };
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += value;
      $("progressText").textContent = `Printing your menu… ${Math.min(99, Math.round(text.length / 45))}%`;
    }
    const broke = text.match(/<<STREAM_ERROR:([a-z_]+)>>/);
    if (broke) throw { code: broke[1] === "max_tokens" ? "too_long" : "busy" };
    const plan = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    // a usable menu has days and something to buy; anything else is a failed print
    const shopping = Array.isArray(plan.shopping) ? plan.shopping.filter((s) => Array.isArray(s.items) && s.items.length) : [];
    if (!Array.isArray(plan.days) || !plan.days.length || !shopping.length) throw { code: "bad_menu" };
    // most expensive first within each store (done here, so ticks keep matching their items)
    shopping.forEach((s) => s.items.sort((a, b) => (+b.price || 0) - (+a.price || 0)));
    plan.shopping = shopping;
    reconcile(plan, deals, profile.country); // promo marks and end dates from the real deals
    menu = {
      weekLabel: `${dayMonth(week[0])} – ${dayMonth(week[6])}`, start: iso(week[0]),
      dates: days.map(iso), made: iso(new Date()), plan, checked: {},
    };
    LS.set("menu", menu);
    renderMenu();
  } catch (e) {
    const msg = ERRORS[e?.code] || FAILED;
    if (menu) { renderMenu(); alert(msg); }
    else { $("progress").classList.add("hidden"); $("menuEmpty").classList.remove("hidden"); renderEmptyText(msg); }
  } finally {
    busy = false;
    $$(".makeBtn").forEach((b) => (b.disabled = false));
  }
}
$("makeBtn1").onclick = $("makeBtn2").onclick = () => makeMenu();

// ---------- week banners ----------
// The menu is fixed until the next deals arrive on Sunday.
function weekNotes(p) {
  const today = iso(new Date());
  if (menu.dates[menu.dates.length - 1] < today) {
    const msg = "This menu was for a past week. Print a new one for this week's deals.";
    return { picks: msg, shop: msg, stale: true };
  }
  const sunday = fromIso(menu.start); sunday.setDate(sunday.getDate() + 6);
  const next = shortDate(sunday);
  // the earliest end date among the promo items on the list
  const early = (p.shopping || []).flatMap((s) => s.items || [])
    .filter((i) => i.promo && /^\d{4}-\d{2}-\d{2}$/.test(i.until || "")).map((i) => i.until)
    .sort()[0];
  return {
    picks: `This menu is set for the week. New deals arrive ${next}.`,
    shop: early && early < iso(sunday)
      ? `Shop by ${shortDate(fromIso(early))}: some promo prices end then. New deals arrive ${next}.`
      : `Promo prices are valid all week. New deals arrive ${next}.`,
    stale: false,
  };
}

// ---------- render the menu ----------
function changeBox(id, placeholder, rows, small) {
  const s = small ? " small" : "";
  return `<button class="btn ghost${s}" type="button" data-open="${id}">${small ? "Change this day" : "Change something"}</button>
    <div class="hidden${small ? " day-box" : ""}" data-box="${id}">
      ${small ? "" : `<label class="field"><span>What would you like changed?</span>`}
      <textarea maxlength="${small ? 200 : 300}" rows="${rows}" placeholder="${placeholder}"></textarea>
      ${small ? "" : "</label>"}
      <div class="actions center">
        <button class="btn makeBtn${s}" type="button" data-apply="${id}">${small ? "Reprint" : "Reprint with changes"}</button>
        <button class="btn ghost${s}" type="button" data-cancel="${id}">Cancel</button>
      </div>
    </div>`;
}

function renderMenu() {
  $("progress").classList.add("hidden");
  const has = !!menu;
  $("menuEmpty").classList.toggle("hidden", has); $("menuOut").classList.toggle("hidden", !has);
  $("listEmpty").classList.toggle("hidden", has); $("listOut").classList.toggle("hidden", !has);
  if (!has) return;
  const p = menu.plan, ck = menu.checked || {};
  const shopping = Array.isArray(p.shopping) ? p.shopping : [];
  const total = shopping.reduce((a, s) => a + sumPrices(s.items), 0);
  const count = shopping.reduce((a, s) => a + (s.items || []).length, 0);
  const under = profile.budget - total;
  const saved = shopping.reduce((a, s) => a + (s.items || []).reduce((b, i) => b + (i.promo && i.saved > 0 ? i.saved : 0), 0), 0);
  const meals = [["Breakfast", "breakfast"], ["Lunch", "lunch"], ["Dinner", "dinner"]].filter(([m]) => profile.meals.includes(m));
  const dates = menu.dates.map(fromIso);
  const notes = weekNotes(p);
  const banner = (t) => `<p class="week-banner${notes.stale ? " stale" : ""}">${esc(t)}</p>`;

  $("menuOut").innerHTML = `
    <div class="card">
      <p class="store-line">Week of ${esc(menu.weekLabel)}</p>
      <h2>Chef's picks</h2>
      <p class="intro keywords">${esc([].concat(p.mood || []).slice(0, 3).join(" · "))}</p>
      <hr>
      ${(p.highlights || []).map((h) => `
        <div class="pick"><b>${esc(h.name)} <span class="days">(${esc(h.days)})</span></b>
          ${h.tip ? `<div class="tip">${esc(h.tip)}</div>` : ""}</div>`).join("")}
      ${banner(notes.picks)}
      <div class="change">${changeBox("all", "e.g. no salmon, swap the lentils for chickpeas, something quicker on Wednesday", 3, false)}</div>
    </div>

    <p class="week-head">Your week</p>
    <p class="week-hint">Swipe through the days →</p>
    <div class="week">
      ${(p.days || []).map((d, i) => `
        <div class="card">
          <h2>${esc(dates[i] ? longDay(dates[i]) : d.day)}</h2>
          <p class="date">${dates[i] ? dayMonth(dates[i]) : ""}</p>
          <hr>
          ${meals.map(([label, key]) => `<div class="meal${key === "dinner" ? " din" : ""}"><span class="what">${esc(d[key])}</span><span class="when">(${label})</span></div>`).join("")}
          ${p.snack && p.snack !== "—" ? `<div class="meal"><span class="what">${esc(p.snack)}</span><span class="when">(Snack)</span></div>` : ""}
          <div class="day-change">${changeBox(i, "e.g. lighter lunch, no fish", 3, true)}</div>
        </div>`).join("")}
    </div>

    <div class="card export">
      <h2>Take it with you</h2>
      <p class="intro">Send this week to your phone or computer.</p>
      <hr>
      <div class="actions center">
        <button class="btn ghost" type="button" id="exportNotes">Notes</button>
        <button class="btn ghost" type="button" id="exportCalendar">Calendar</button>
        <button class="btn ghost" type="button" id="exportNotion">Notion</button>
      </div>
      <p class="note c" id="exportMsg"></p>
      <div id="exportLinks"></div>
    </div>`;
  $("listOut").innerHTML = `
    <div class="card shop">
      <p class="store-line">Shopping list · ${esc(menu.weekLabel)}</p>
      <h2>Groceries</h2>
      ${banner(notes.shop)}
      ${shopping.map((s, si) => `
        <p class="store-name">*** ${esc(s.store)} ***</p>
        ${(s.items || []).map((i, ii) => { const k = si + "-" + ii; return `
          <label class="item${ck[k] ? " done" : ""}"><input type="checkbox" data-k="${k}"${ck[k] ? " checked" : ""}>
          <span class="t">${esc(i.item)} <span class="q">${esc(i.qty)}</span>${i.promo ? '<span class="stamp">Promo</span>' : ""}${i.organic ? '<span class="stamp bio">Organic</span>' : ""}</span>
          <span class="p">${i.promo ? "" : "≈"}${num(i.price)}</span></label>`; }).join("")}
        <div class="sub-row"><span>Subtotal ${esc(s.store)}</span><span>${money(sumPrices(s.items))}</span></div>`).join("")}
      <hr>
      <div class="line"><span>Items</span><span class="amt">${count}</span></div>
      <div class="line"><span>Budget</span><span class="amt">${money(profile.budget)}</span></div>
      <div class="total-row"><span>Total</span><span>≈ ${money(total)}</span></div>
      <div class="line${under >= 0 ? " good" : ""}"><span>${under >= 0 ? "Under budget" : "Over budget"}</span><span class="amt">${under >= 0 ? "" : "−"}${money(Math.abs(under))}</span></div>
      ${saved > 0 ? `<div class="line good"><span>Saved with promos</span><span class="amt">${money(saved)}</span></div>` : ""}
      <hr>
      <div class="actions center" style="margin-top:16px">
        <button class="btn ghost" id="copyBtn">Copy list</button>
        <button class="btn ghost" id="printBtn">Print</button>
        <button class="btn makeBtn" id="remakeBtn">New menu</button>
      </div>
      <p class="note c" id="copyMsg"></p>
    </div>`;
  bindMenu(p, shopping, dates);
}

function bindMenu(p, shopping, dates) {
  const out = $("menuOut");
  const q = (sel) => out.querySelector(sel);

  $("listOut").querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.onchange = () => {
    menu.checked = { ...menu.checked, [cb.dataset.k]: cb.checked };
    cb.closest(".item").classList.toggle("done", cb.checked);
    LS.set("menu", menu);
  }));

  // "Change this day" on each day, "Change something" for the whole week
  const toggle = (id, open) => {
    q(`[data-box="${id}"]`).classList.toggle("hidden", !open);
    q(`[data-open="${id}"]`).classList.toggle("hidden", open);
    if (open) q(`[data-box="${id}"] textarea`).focus();
  };
  out.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => toggle(b.dataset.open, true)));
  out.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = () => toggle(b.dataset.cancel, false)));
  out.querySelectorAll("[data-apply]").forEach((b) => (b.onclick = () => {
    const id = b.dataset.apply, ta = q(`[data-box="${id}"] textarea`), t = ta.value.trim();
    if (!t) { ta.focus(); return; }
    if (id === "all") return makeMenu(t);
    const d = dates[+id];
    makeMenu(`Only change ${d ? `${longDay(d)} ${dayMonth(d)}` : p.days[+id]?.day}: ${t}. Keep the other days the same.`);
  }));

  $("remakeBtn").onclick = () => makeMenu();
  $("printBtn").onclick = () => window.print();
  $("copyBtn").onclick = async () => {
    const txt = shopping.map((s) => `${s.store}\n` + (s.items || []).map((i) => `- ${i.item} — ${i.qty} · ${money(i.price)}`).join("\n")).join("\n\n");
    try { await navigator.clipboard.writeText(txt); $("copyMsg").textContent = "Copied to clipboard"; }
    catch { $("copyMsg").textContent = "Couldn't copy here."; }
  };

  // exports, in whatever form this device handles best
  const dev = device();
  const say = (t) => ($("exportMsg").textContent = t);
  const links = (html) => ($("exportLinks").innerHTML = html);
  const gcalLinks = () => `<div class="links">${googleDayLinks(menu, profile).map((l) => `<a class="btn ghost small" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>`;
  const calendarFile = async () => (await openICS(menuICS(menu, profile))) || (say("Couldn't make the calendar file. Try again in a moment."), false);

  $("exportNotes").onclick = async () => {
    const text = menuText(menu, profile, money);
    links("");
    if (dev.canShare) {
      // Share sheet: Apple Notes on iPhone, iPad and Mac; Google Keep or Samsung Notes on Android.
      try { await navigator.share({ title: `The Menu · ${menu.weekLabel}`, text }); say("Sent ✓"); return; }
      catch (e) { if (e?.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text); say("Copied. Paste it into a new note."); }
    catch { download("the-menu.txt", text, "text/plain"); say("Downloaded as a text file."); }
  };

  $("exportCalendar").onclick = async () => {
    const icsName = `the-menu-${menu.start}.ics`;
    const fileLink = `<a href="#" id="icsFile">download the calendar file</a>`;
    const wire = () => {
      $("icsFile") && ($("icsFile").onclick = (e) => { e.preventDefault(); download(icsName, menuICS(menu, profile), "text/calendar"); say("Calendar file downloaded. Open it to add your meals."); });
      $("gcalLinks") && ($("gcalLinks").onclick = (e) => { e.preventDefault(); links(gcalLinks()); });
    };
    if (dev.android || dev.notSafariIOS) {
      // Google Calendar can't import a file from the web, and apps' built-in
      // browsers (and Chrome on iPhone) can't open one in Calendar: add day by day.
      say(dev.notSafariIOS
        ? "To add the whole week to Apple Calendar at once, open The Menu in Safari and tap Calendar there. Or add it day by day to Google Calendar:"
        : "Tap each day to add it to Google Calendar.");
      links(gcalLinks() + (dev.notSafariIOS ? "" : `<p class="note c">Using another calendar app? ${fileLink}</p>`));
      wire();
      return;
    }
    if (dev.iOS) {
      // Ask which calendar: Apple's takes the whole week at once, Google's day by day.
      say("Which calendar do you use?");
      links(`<div class="actions center"><button class="btn ghost small" type="button" id="calApple">Apple Calendar</button><button class="btn ghost small" type="button" id="calGoogle">Google Calendar</button></div>`);
      $("calGoogle").onclick = () => {
        say("Tap each day to add it to Google Calendar.");
        links(gcalLinks() + `<p class="note c">Or the whole week at once: add your Google account in Settings → Calendar → Accounts, make it the Default Calendar, then use Apple Calendar here.</p>`);
      };
      $("calApple").onclick = async () => {
        say("Preparing your calendar…");
        if (!(await calendarFile())) return;
        say("Tap “Add All” to put your meals in Calendar.");
        links(`<p class="note c">Nothing happened? Add it <a href="#" id="gcalLinks">day by day to Google Calendar</a>.</p>`);
        wire();
      };
      return;
    }
    // Computers: download the file straight away, no round trip to the server.
    download(icsName, menuICS(menu, profile), "text/calendar");
    say("Calendar file downloaded. Open it to add your meals to Calendar or Outlook.");
    links(`<p class="note c">Use Google Calendar? <a href="#" id="gcalLinks">Add day by day instead</a></p>`);
    wire();
  };

  $("exportNotion").onclick = async () => {
    const md = menuText(menu, profile, money, { markdown: true });
    links("");
    try {
      await navigator.clipboard.writeText(md);
      // Notion turns pasted Markdown into headings, bullets and to-do checkboxes.
      say(`Copied. Open a new Notion page and paste (${dev.mobile ? "tap and hold, then Paste" : dev.mac ? "⌘V" : "Ctrl+V"}).`);
      links(`<div class="links"><a class="btn small" href="https://www.notion.so/new" target="_blank" rel="noopener">Open Notion</a></div>`);
    } catch {
      download("the-menu.md", md, "text/markdown");
      say("Downloaded. In Notion, use Import → Markdown.");
    }
  };
}

// ---------- start ----------
renderSettings(); renderEmptyText(); renderMenu();
loadDeals();
if (!LS.get("profile") && !menu) show("settings");
