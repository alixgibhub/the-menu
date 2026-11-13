// Small password-protected page for posting this week's supermarket deals.
import { COUNTRIES } from "../public/countries.js";
const STORE_LIST = Object.fromEntries(Object.entries(COUNTRIES).map(([cc, c]) => [cc, Object.keys(c.stores)]));

export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>The Menu · Deals admin</title>
<style>
  :root{--bg:#fbf6ee;--card:#fffdf9;--ink:#2b2622;--muted:#7a6f66;--line:#eadfd1;--carrot:#e2672b;--leaf:#3f6b4a}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
  .wrap{max-width:760px;margin:0 auto;padding:24px 18px 64px}
  h1{font-family:Georgia,serif;margin:0 0 4px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:16px 0}
  input,textarea{width:100%;font:14px/1.5 ui-monospace,Menlo,monospace;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
  textarea{min-height:420px}
  .btn{border:0;border-radius:12px;padding:11px 18px;font:600 15px system-ui;cursor:pointer;background:var(--carrot);color:#fff}
  .note{color:var(--muted);font-size:13px}
  code{background:var(--bg);padding:1px 5px;border-radius:5px}
  .row{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}
  .ok{color:var(--leaf)} .err{color:#b3261e}
</style></head>
<body><div class="wrap">
  <h1>🥕 Deals admin</h1>
  <p class="note">Post this week's promotions. Every menu made on the site uses them.</p>

  <div class="card" id="login">
    <label><b>Admin password</b><input type="password" id="token" autocomplete="current-password"></label>
    <div class="row"><button class="btn" id="go">Open</button><span id="loginMsg" class="note"></span></div>
  </div>

  <div class="card" id="auto" hidden>
    <b>Researched deals</b>
    <p class="note" style="margin-top:4px">Every Sunday a scheduled Claude task researches every country's promotions for the coming week and saves them to <code>public/data/deals.json</code> on GitHub.</p>
    <div id="status" class="note" style="margin-top:10px"></div>
  </div>

  <div class="card" id="editor" hidden>
    <p class="note" style="margin-top:0"><b>Your own deals</b> (optional). These are added on top of the researched ones.</p>
    <p class="note" style="margin-top:0">One heading per store, starting with the country code: <code># FR Carrefour</code>.<br>
      Then one deal per line, price in that country's currency:<br>
      <code>product; price; valid until (YYYY-MM-DD); loyalty card (optional)</code></p>
    <textarea id="text" spellcheck="false" placeholder="# BE Lidl&#10;Salmon fillet 400 g; 4.99; 2026-11-26; Lidl Plus"></textarea>
    <div class="row"><button class="btn" id="save">Publish deals</button><span id="msg" class="note"></span></div>
    <div class="note">Stores the app knows:<div id="stores"></div></div>
  </div>
</div>
<script>
const STORES = ${JSON.stringify(STORE_LIST)};
const $ = id => document.getElementById(id);
$("stores").innerHTML = Object.entries(STORES).map(([cc, list]) => "<div><b>" + cc + "</b> " + list.join(", ") + "</div>").join("");
let token = sessionStorage.getItem("menu-admin") || "";

function toText(deals){
  const s = {};
  for (const [k, l] of Object.entries(deals.stores)) { const m = l.filter(d => !d.auto); if (m.length) s[k] = m; }
  return Object.keys(s).map(key => "# " + key.replace("/", " ") + "\\n" +
    s[key].map(d => [d.item, d.price, d.validTo || "", d.card || ""].join("; ").replace(/(; )+$/, "")).join("\\n")).join("\\n\\n");
}
function fromText(t){
  const stores = {}; let cur = null; const errors = [];
  t.split("\\n").forEach((raw, n) => {
    const line = raw.trim(); if (!line) return;
    if (line.startsWith("#")){
      const head = line.slice(1).trim();
      const cc = head.slice(0, 2).toUpperCase(), name = head.slice(2).replace(/^[\\s/·-]+/, "").trim();
      const store = (STORES[cc] || []).find(s => s.toLowerCase() === name.toLowerCase());
      cur = store ? cc + "/" + store : null;
      if (!STORES[cc]) errors.push("Line " + (n+1) + ": start the heading with a country code (" + Object.keys(STORES).join(", ") + ")");
      else if (!cur) errors.push("Line " + (n+1) + ": unknown store \\"" + name + "\\" for " + cc);
      else stores[cur] = stores[cur] || [];
      return;
    }
    if (!cur){ errors.push("Line " + (n+1) + ": add a # Store heading first"); return; }
    const [item, price, validTo, card] = line.split(";").map(x => (x||"").trim());
    const p = parseFloat(String(price).replace(",", ".").replace(/[^0-9.]/g,""));
    if (!item || isNaN(p)){ errors.push("Line " + (n+1) + ": needs a product and a price"); return; }
    if (validTo && !/^\\d{4}-\\d{2}-\\d{2}$/.test(validTo)){ errors.push("Line " + (n+1) + ": date should look like 2026-11-19"); return; }
    stores[cur].push({ item, price: p, validTo: validTo || undefined, card: card || undefined });
  });
  return { stores, errors };
}

async function open(){
  token = $("token").value.trim() || token;
  const r = await fetch("/api/deals"); const deals = await r.json();
  $("text").value = toText(deals);
  const chk = await fetch("/api/deals", { method:"POST", headers:{ "content-type":"application/json", authorization:"Bearer " + token }, body: JSON.stringify({ check: true }) });
  if (chk.status === 401){ $("loginMsg").textContent = "Wrong password."; $("loginMsg").className = "err"; return; }
  sessionStorage.setItem("menu-admin", token);
  $("login").hidden = true; $("editor").hidden = false; $("auto").hidden = false;
  const st = deals.countries || {};
  $("status").innerHTML = Object.keys(STORES).map(cc => "<div><b>" + cc + "</b> " + (st[cc] ? (st[cc].found + " deals · researched " + (st[cc].at || "").slice(0,16).replace("T"," ")) : "not checked yet") + "</div>").join("");
  $("msg").textContent = deals.updated ? "Last published " + deals.updated : "";
}
$("go").onclick = open;

$("token").onkeydown = e => { if (e.key === "Enter") open(); };
if (token) open();

$("save").onclick = async () => {
  const { stores, errors } = fromText($("text").value);
  if (errors.length){ $("msg").textContent = errors.join(" · "); $("msg").className = "err"; return; }
  $("msg").textContent = "Publishing…"; $("msg").className = "note";
  const r = await fetch("/api/deals", { method:"POST", headers:{ "content-type":"application/json", authorization:"Bearer " + token }, body: JSON.stringify({ stores }) });
  if (r.ok){ const n = Object.values(stores).reduce((a,l)=>a+l.length,0); $("msg").textContent = "Published " + n + " deals ✓"; $("msg").className = "ok"; }
  else { $("msg").textContent = "Couldn't publish (" + r.status + ")."; $("msg").className = "err"; }
};
</script></body></html>`;
