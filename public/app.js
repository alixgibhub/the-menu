import { COUNTRIES, DEFAULT_COUNTRY } from "/countries.js";

(() => {
  const country = () => COUNTRIES[profile.country] || COUNTRIES[DEFAULT_COUNTRY];
  const storesFor = cc => Object.keys(COUNTRIES[cc].stores);
  const MEALS = ["Breakfast","Lunch","Dinner","Snack"];
  const DIETS = ["Vegetarian","Pescatarian","Vegan","Lactose-free","Gluten-free","No pork","High protein"];

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = (n, opts) => new Intl.NumberFormat("en-GB", { style:"currency", currency: country().currency, ...opts }).format(+n || 0);
  const money = n => fmt(n);                                         // e.g. €12.50, £12.50, CHF 12.50, MX$120.00
  const num = n => fmt(n).replace(/[^0-9.,]/g, "");                  // just the number, for receipt columns
  const symbol = () => fmt(0).replace(/[0-9.,\s]/g, "") || country().currency;

  function guessCountry(){
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      for (const [cc, c] of Object.entries(COUNTRIES)) if ((c.timezones||[]).includes(tz)) return cc;
    } catch(e){}
    return DEFAULT_COUNTRY;
  }
  const startFor = cc => ({ country: cc, stores: storesFor(cc).slice(0, 2), cards: [], budget: COUNTRIES[cc].budget });
  const defaults = { ...startFor(guessCountry()), otherCards:"", people:1, meals:["Breakfast","Lunch","Dinner","Snack"], cookTime:"normal", priority:"budget", diet:[], dislikes:"", fridge:"" };
  let profile = {...defaults};
  let menu = null;   // {weekLabel, made, plan, checked:{}}
  let deals = null;  // {updated, stores:{Store:[{item,price,validFrom,validTo,card}]}}

  // ---------- storage (this browser only) ----------
  const LS = {
    get(k){ try{ return JSON.parse(localStorage.getItem("themenu:"+k)); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem("themenu:"+k, JSON.stringify(v)); }catch(e){} }
  };

  // ---------- tabs ----------
  const views = ["menu","settings","deals"];
  function show(v){
    views.forEach(n => { $("view-"+n).classList.toggle("hidden", n!==v); $("tab-"+n).classList.toggle("on", n===v); });
  }
  views.forEach(n => $("tab-"+n).onclick = () => show(n));

  // ---------- chips ----------
  function chipGroup(el, options, getSel, setSel, onChange){
    el.innerHTML = "";
    options.forEach(o => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (getSel().includes(o) ? " on" : "");
      b.textContent = o;
      b.onclick = () => {
        const s = getSel().slice(); const i = s.indexOf(o);
        i >= 0 ? s.splice(i,1) : s.push(o);
        setSel(s); b.classList.toggle("on");
        if (onChange) onChange();
      };
      el.appendChild(b);
    });
  }
  function renderCountryChips(){
    const el = $("countryChips"); el.innerHTML = "";
    Object.entries(COUNTRIES).forEach(([cc, c]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (profile.country === cc ? " on" : "");
      b.textContent = c.name;
      b.onclick = () => {
        if (profile.country === cc) return;
        readSettings();
        Object.assign(profile, startFor(cc));   // new country: its own shops, cards and budget
        renderSettings(); renderDeals();
      };
      el.appendChild(b);
    });
  }
  // Loyalty card numbers stay in this browser only. They are never part of the
  // profile, so they are never sent to the server or to Claude.
  let cardNumbers = LS.get("cardNumbers") || {};
  const cleanNumber = v => String(v || "").replace(/\s+/g, "").slice(0, 40);

  function renderCardChips(){
    const cards = country().stores;
    const opts = [...new Set(profile.stores.map(s => cards[s]).filter(Boolean))];
    profile.cards = profile.cards.filter(c => opts.includes(c));
    chipGroup($("cardChips"), opts, () => profile.cards, s => profile.cards = s, renderCardNumbers);
    if (!opts.length) $("cardChips").innerHTML = '<span class="note">Pick a supermarket first.</span>';
    renderCardNumbers();
  }
  function renderCardNumbers(){
    const el = $("cardNumbers");
    el.innerHTML = profile.cards.map(c => `
      <label class="field card-no"><span>${esc(c)} number</span>
        <input type="text" inputmode="numeric" autocomplete="off" data-card="${esc(c)}" value="${esc(cardNumbers[c] || "")}" placeholder="Optional">
      </label>`).join("");
    $("cardNumbersBox").classList.toggle("hidden", !profile.cards.length);
  }
  function readCardNumbers(){
    document.querySelectorAll("#cardNumbers input").forEach(i => {
      const n = cleanNumber(i.value);
      if (n) cardNumbers[i.dataset.card] = n; else delete cardNumbers[i.dataset.card];
    });
    LS.set("cardNumbers", cardNumbers);
  }
  function renderPriority(){
    document.querySelectorAll("#priorityChoices .choice").forEach(b => {
      b.classList.toggle("on", b.dataset.priority === profile.priority);
      b.onclick = () => { profile.priority = b.dataset.priority; renderPriority(); };
    });
  }
  function renderSettings(){
    renderCountryChips();
    renderPriority();
    chipGroup($("storeChips"), storesFor(profile.country), () => profile.stores, s => profile.stores = s, renderCardChips);
    $("budgetLabel").textContent = `Weekly budget (${symbol()})`;
    renderCardChips();
    chipGroup($("mealChips"), MEALS, () => profile.meals, s => profile.meals = s);
    chipGroup($("dietChips"), DIETS, () => profile.diet, s => profile.diet = s);
    $("otherCards").value = profile.otherCards || "";
    $("people").value = profile.people; $("budget").value = profile.budget;
    $("cookTime").value = profile.cookTime; $("dislikes").value = profile.dislikes || ""; $("fridge").value = profile.fridge || "";
  }
  function readSettings(){
    profile.otherCards = $("otherCards").value.trim();
    profile.people = Math.max(1, Math.min(8, parseInt($("people").value)||1));
    profile.budget = Math.max(1, parseFloat($("budget").value) || country().budget);
    profile.cookTime = $("cookTime").value;
    profile.dislikes = $("dislikes").value.trim();
    profile.fridge = $("fridge").value.trim();
  }

  $("saveBtn").onclick = () => {
    readSettings(); readCardNumbers();
    if (!profile.stores.length){ $("saveMsg").textContent = "Pick at least one supermarket."; return; }
    LS.set("profile", profile);
    $("saveMsg").textContent = "Saved ✓";
    renderEmptyText();
    setTimeout(() => { $("saveMsg").textContent = ""; show("menu"); }, 900);
  };

  // ---------- dates ----------
  const DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function weekDays(){
    const t = new Date(); t.setHours(0,0,0,0);
    const dow = t.getDay(); // 0 Sun
    // Mon–Thu: this week. Fri–Sun: next week.
    const offset = (dow >= 1 && dow <= 4) ? 1 - dow : (dow === 0 ? 1 : 8 - dow);
    const mon = new Date(t); mon.setDate(t.getDate() + offset);
    return [...Array(7)].map((_,i) => { const d = new Date(mon); d.setDate(mon.getDate()+i); return d; });
  }
  const lab = d => `${DN[d.getDay()]} ${d.getDate()}`;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  function weekLabel(days){ const a=days[0], b=days[6]; return `${a.getDate()} ${MN[a.getMonth()]} – ${b.getDate()} ${MN[b.getMonth()]}`; }

  // ---------- deals ----------
  function validDeals(){
    if (!deals || !deals.stores) return {};
    const today = iso(new Date()); const out = {};
    const prefix = profile.country + "/";
    for (const [key, list] of Object.entries(deals.stores)){
      if (!Array.isArray(list)) continue;
      const k = key.includes("/") ? key : DEFAULT_COUNTRY + "/" + key;  // older deals were Belgian
      if (!k.startsWith(prefix)) continue;
      const store = k.slice(prefix.length);
      const ok = list.filter(x => !x.validTo || x.validTo >= today);
      if (ok.length) out[store] = ok;
    }
    return out;
  }
  function renderDeals(){
    const v = validDeals(); const stores = Object.keys(v);
    if (!stores.length){
      $("dealsIntro").textContent = `No current deals posted for ${country().name} yet. Menus use typical local prices, marked ≈.`;
      $("dealsOut").innerHTML = ""; return;
    }
    $("dealsIntro").textContent = "Promo prices your menu can use" + (deals.updated ? ` · updated ${deals.updated}` : "") + ".";
    $("dealsOut").innerHTML = stores.map(s => `
      <p class="store-name">*** ${esc(s)} ***</p>
      <table class="deals"><tr><th>Product</th><th>Price</th><th>Until</th></tr>
      ${v[s].map(x => `<tr><td>${esc(x.item)}${x.card?`<span class="stamp">${esc(x.card)}</span>`:""}</td><td>${money(x.price)}</td><td>${x.validTo?esc(x.validTo.slice(8)+"/"+x.validTo.slice(5,7)):"—"}</td></tr>`).join("")}
      </table>`).join("");
  }
  async function loadDeals(){
    try { const r = await fetch("/api/deals"); deals = await r.json(); }
    catch(e){ deals = null; }
    renderDeals();
  }

  // ---------- generate ----------
  function renderEmptyText(msg){
    $("emptyText").textContent = msg || (profile.stores.length
      ? `${country().name} · ${profile.priority === "quality" ? "quality first" : "budget first"} · shopping at ${profile.stores.join(", ")}. Budget ${money(profile.budget)} for ${profile.people} ${profile.people>1?"people":"person"}.`
      : "Set your supermarkets and preferences first, then make your week.");
  }

  function parseJSON(text){
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b < 0) throw new Error("no json");
    return JSON.parse(text.slice(a, b+1));
  }

  const ERRORS = {
    daily_limit: "You've made today's menus. Come back tomorrow for a fresh one.",
    daily_limit_all: "The Menu is very popular today and has reached its daily limit. Try again tomorrow.",
    busy: "The chef is busy right now. Try again in a minute.",
    not_configured: "Menu writing isn't switched on yet.",
    no_stores: "Pick at least one supermarket in your settings first.",
  };

  let busy = false;
  async function makeMenu(){
    if (busy) return;
    if (!profile.stores.length){ show("settings"); return; }
    busy = true;
    const days = weekDays();
    show("menu");
    $("menuEmpty").classList.add("hidden"); $("menuOut").classList.add("hidden");
    $("progress").classList.remove("hidden"); $("progressText").textContent = "Printing your week…";
    document.querySelectorAll(".makeBtn").forEach(b => b.disabled = true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, days: days.map(lab) }),
      });
      if (!res.ok){
        const err = await res.json().catch(() => ({}));
        throw Object.assign(new Error(err.error || "error"), { code: err.error });
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let text = "";
      for (;;){
        const { value, done } = await reader.read();
        if (done) break;
        text += value;
        $("progressText").textContent = `Printing your menu… ${Math.min(99, Math.round(text.length/45))}%`;
      }
      const plan = parseJSON(text);
      menu = { weekLabel: weekLabel(days), made: iso(new Date()), plan, checked: {} };
      LS.set("menu", menu);
      renderMenu();
    } catch(e){
      $("progress").classList.add("hidden");
      if (menu && menu.plan){ renderMenu(); alert(ERRORS[e.code] || "Something went wrong writing the menu. Try again."); }
      else { $("menuEmpty").classList.remove("hidden"); renderEmptyText(ERRORS[e.code] || "Something went wrong writing the menu. Try again."); }
    } finally {
      busy = false;
      document.querySelectorAll(".makeBtn").forEach(b => b.disabled = false);
    }
  }
  $("makeBtn1").onclick = makeMenu;

  // ---------- render menu ----------
  const FULL = {Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday",Sat:"Saturday",Sun:"Sunday"};
  const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // A real, scannable barcode for a loyalty card. EAN-13 / EAN-8 when the number is one
  // (valid check digit), otherwise Code 128, which checkout scanners also read.
  function eanValid(d){
    const n = d.split("").map(Number), check = n.pop();
    const sum = n.reverse().reduce((a, x, i) => a + x * (i % 2 ? 1 : 3), 0);
    return (10 - sum % 10) % 10 === check;
  }
  function cardFormat(num){
    if (/^\d{13}$/.test(num) && eanValid(num)) return "EAN13";
    if (/^\d{8}$/.test(num) && eanValid(num)) return "EAN8";
    return "CODE128";
  }
  function cardBarcode(store){
    const card = country().stores[store] || Object.entries(country().stores).find(([k]) => k.toLowerCase() === String(store).toLowerCase())?.[1];
    const num = card && cardNumbers[card];
    if (!num) return "";
    return `<div class="loyalty"><p class="loyalty-name">${esc(card)}</p>
      <svg class="card-code" data-value="${esc(num)}" data-format="${cardFormat(num)}" role="img" aria-label="${esc(card)} barcode"></svg></div>`;
  }
  function drawCardBarcodes(){
    if (!window.JsBarcode) return;
    document.querySelectorAll("svg.card-code").forEach(el => {
      try {
        JsBarcode(el, el.dataset.value, { format: el.dataset.format, width: 2, height: 64, margin: 12,
          displayValue: true, font: "Courier Prime", fontSize: 14, textMargin: 4, background: "#ffffff", lineColor: "#000000" });
      } catch(e){
        JsBarcode(el, el.dataset.value, { format: "CODE128", width: 2, height: 64, margin: 12, displayValue: true, font: "Courier Prime", fontSize: 14, background: "#ffffff" });
      }
    });
  }
  function dayParts(label, i){
    const [d, n] = String(label).split(" ");
    const base = weekDays()[i];
    return { name: FULL[d] || d || "", date: n ? `${n} ${MONTH[base ? base.getMonth() : 0]}` : "" };
  }

  function renderMenu(){
    $("progress").classList.add("hidden");
    if (!menu || !menu.plan){ $("menuEmpty").classList.remove("hidden"); $("menuOut").classList.add("hidden"); return; }
    const p = menu.plan; const ck = menu.checked || {};
    const stores = Array.isArray(p.shopping) ? p.shopping : [];
    let total = 0, count = 0;
    stores.forEach(s => (s.items||[]).forEach(i => { total += +i.price || 0; count++; }));
    const under = profile.budget - total;
    const meals = [["Breakfast","breakfast",""],["Lunch","lunch",""],["Dinner","dinner","din"]].filter(m => profile.meals.includes(m[0]));

    $("menuOut").innerHTML = `
      <div class="card receipt">
        <p class="store-line">Week of ${esc(menu.weekLabel)}</p>
        <h2>Chef's picks</h2>
        <p class="intro">${esc(p.mood)}</p>
        <hr>
        ${(p.highlights||[]).map(h => `
          <div class="pick"><b>${esc(h.name)} <span class="days">(${esc(h.days)})</span></b>
            <div class="why">${esc(h.benefit)}</div>
            <div class="tip">${esc(h.tip)}</div></div>`).join("")}
      </div>

      <p class="week-head">Your week</p>
      <p class="week-hint">Swipe through the days →</p>
      <div class="week">
        ${(p.days||[]).map((d,i) => { const dp = dayParts(d.day, i); return `
          <div class="card receipt">
            <h2>${esc(dp.name)}</h2>
            <p class="date">${esc(dp.date)}</p>
            <hr>
            ${meals.map(([lbl,key,cls]) => `<div class="meal ${cls}"><span class="what">${esc(d[key])}</span><span class="when">(${lbl})</span></div>`).join("")}
            ${p.snack && p.snack !== "—" ? `<div class="meal"><span class="what">${esc(p.snack)}</span><span class="when">(Snack)</span></div>` : ""}
            <hr>
            <div class="line"><span>Total meals</span><span class="amt">${meals.length}</span></div>
          </div>`; }).join("")}
      </div>

      <div class="card receipt shop">
        <p class="store-line">Shopping list · ${esc(menu.weekLabel)}</p>
        <h2>Groceries</h2>
        ${stores.map((s,si) => {
          const sub = (s.items||[]).reduce((a,i)=>a+(+i.price||0),0);
          return `<p class="store-name">*** ${esc(s.store)} ***</p>
            ${(s.items||[]).map((i,ii) => { const k = si+"-"+ii; return `
              <label class="item ${ck[k]?"done":""}"><input type="checkbox" data-k="${k}" ${ck[k]?"checked":""}>
              <span class="t">${esc(i.item)} <span class="q">${esc(i.qty)}</span>${i.promo?'<span class="stamp">Promo</span>':""}${i.organic?'<span class="stamp bio">Organic</span>':""}</span>
              <span class="p">${i.promo?"":"≈"}${num(i.price)}</span></label>`; }).join("")}
            <div class="sub-row"><span>Subtotal ${esc(s.store)}</span><span>${money(sub)}</span></div>
            ${cardBarcode(s.store)}`; }).join("")}
        <hr>
        <div class="line"><span>Items</span><span class="amt">${count}</span></div>
        <div class="line"><span>Budget</span><span class="amt">${money(profile.budget)}</span></div>
        <div class="total-row"><span>Total</span><span>≈ ${money(total)}</span></div>
        <div class="line"><span>${under >= 0 ? "Under budget" : "Over budget"}</span><span class="amt">${under >= 0 ? "" : "−"}${money(Math.abs(under))}</span></div>
        <hr>
        <p class="fine">Promo prices come from this week's deals. ≈ prices are estimates. Assumes oil, salt and spices are in the cupboard.${p.notes?" "+esc(p.notes):""} Thank you for cooking with The Menu.</p>
        <div class="actions center" style="margin-top:16px">
          <button class="btn ghost" id="copyBtn">Copy list</button>
          <button class="btn ghost" id="printBtn">Print</button>
          <button class="btn makeBtn" id="remakeBtn">New menu</button>
        </div>
        <p class="note" id="copyMsg" style="text-align:center;margin:8px 0 0"></p>
      </div>`;
    $("menuEmpty").classList.add("hidden"); $("menuOut").classList.remove("hidden");
    drawCardBarcodes();

    $("menuOut").querySelectorAll("input[type=checkbox]").forEach(cb => cb.onchange = () => {
      menu.checked = {...(menu.checked||{}), [cb.dataset.k]: cb.checked};
      cb.closest(".item").classList.toggle("done", cb.checked);
      LS.set("menu", menu);
    });
    $("remakeBtn").onclick = makeMenu;
    $("printBtn").onclick = () => window.print();
    $("copyBtn").onclick = async () => {
      const txt = stores.map(s => `${s.store}\n` + (s.items||[]).map(i => `- ${i.item} — ${i.qty} · ${money(i.price)}`).join("\n")).join("\n\n");
      try { await navigator.clipboard.writeText(txt); $("copyMsg").textContent = "Copied to clipboard"; }
      catch(e){ $("copyMsg").textContent = "Couldn't copy here."; }
    };
  }

  // ---------- boot ----------
  const saved = LS.get("profile");
  if (saved && !saved.country) saved.country = DEFAULT_COUNTRY;   // saved before countries existed
  profile = {...defaults, ...(saved||{})};
  profile.stores = profile.stores.filter(x => storesFor(profile.country).includes(x));
  menu = LS.get("menu");
  renderSettings(); renderEmptyText(); renderMenu();
  loadDeals();
  if (!saved && !(menu && menu.plan)) show("settings");
})();
