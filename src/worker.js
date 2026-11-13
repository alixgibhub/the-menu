// The Menu — Cloudflare Worker
// Serves the static app from /public and a small API:
//   GET  /api/deals          current supermarket promotions (public)
//   POST /api/menu           writes a weekly menu with Claude (streams back text)
//   POST /api/deals          replaces the promotions (needs ADMIN_TOKEN)
//   GET  /admin              deals admin page

import { buildPrompt, cleanProfile } from "./prompt.js";
import { readDeals, readManualDeals } from "./deals.js";
import { COUNTRIES, DEFAULT_COUNTRY } from "../public/countries.js";
import { ADMIN_HTML } from "./admin.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname === "/admin") {
        return new Response(ADMIN_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (pathname === "/api/deals" && request.method === "GET") return json(publicDeals(await readDeals(env, request)));
      if (pathname === "/api/deals" && request.method === "POST") return saveDeals(request, env);
      if (pathname === "/api/menu" && request.method === "POST") return makeMenu(request, env, ctx);
      if (pathname === "/api/calendar" && request.method === "POST") return saveCalendar(request, env);
      if (pathname.startsWith("/api/calendar/") && request.method === "GET") return getCalendar(pathname, env);
      if (pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "server_error" }, 500);
    }
    return env.ASSETS.fetch(request);
  }
};

// ---------- deals ----------
// What the app sees: the deals, plus when each country was last researched.
function publicDeals(deals) {
  return { updated: deals.updated || null, countries: deals.countries || {}, stores: deals.stores || {} };
}

function validDealKey(key) {
  const [cc, store] = String(key).split("/");
  return !!(COUNTRIES[cc] && store && store in COUNTRIES[cc].stores);
}

function isAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

async function saveDeals(request, env) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (body && body.check) return json({ ok: true }); // password check only
  if (!body || typeof body.stores !== "object") return json({ error: "bad_request" }, 400);

  const stores = {};
  for (const [store, list] of Object.entries(body.stores)) {
    if (!validDealKey(store) || !Array.isArray(list)) continue;
    stores[store] = list.slice(0, 80).map((d) => ({
      item: String(d.item || "").slice(0, 120),
      price: Math.max(0, Number(d.price) || 0),
      validFrom: /^\d{4}-\d{2}-\d{2}$/.test(d.validFrom) ? d.validFrom : undefined,
      validTo: /^\d{4}-\d{2}-\d{2}$/.test(d.validTo) ? d.validTo : undefined,
      card: d.card ? String(d.card).slice(0, 60) : undefined,
    })).filter((d) => d.item);
  }
  // Hand-posted deals live in KV; the researched deals file is left alone.
  const deals = { updated: new Date().toISOString().slice(0, 10), stores };
  await env.MENU_KV.put("deals", JSON.stringify(deals));
  return json({ ok: true, deals: publicDeals(await readDeals(env, request)) });
}

// ---------- calendar export ----------
// The browser builds the .ics and posts it here; we keep it for an hour and
// hand back a short link. Opening that link with a normal GET is what makes
// iPhone and iPad offer "Add All" in Calendar.
async function saveCalendar(request, env) {
  const ics = await request.text().catch(() => "");
  if (!ics || ics.length > 200000 || !ics.startsWith("BEGIN:VCALENDAR") || !ics.trimEnd().endsWith("END:VCALENDAR")) {
    return json({ error: "bad_request" }, 400);
  }
  const id = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  await env.MENU_KV.put(`ics:${id}`, ics, { expirationTtl: 3600 });
  return json({ url: `/api/calendar/${id}.ics` });
}

async function getCalendar(pathname, env) {
  const id = (pathname.match(/^\/api\/calendar\/([a-f0-9]{24})\.ics$/) || [])[1];
  const ics = id && (await env.MENU_KV.get(`ics:${id}`));
  if (!ics) return new Response("This calendar link has expired. Go back to The Menu and tap Calendar again.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="the-menu.ics"',
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

// ---------- menu ----------
async function makeMenu(request, env, ctx) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);

  const body = await request.json().catch(() => null);
  if (!body || !body.profile || !Array.isArray(body.days)) return json({ error: "bad_request" }, 400);

  const profile = cleanProfile(body.profile);
  if (!profile.stores.length) return json({ error: "no_stores" }, 400);
  const days = body.days.slice(0, 7).map((d) => String(d).slice(0, 12));
  if (days.length < 1) return json({ error: "bad_request" }, 400);

  // Optional: the person's current menu plus the changes they want.
  let change = null;
  if (body.edits) {
    const edits = String(body.edits).replace(/[\r\n]+/g, " ").replace(/"/g, "'").trim().slice(0, 300);
    const previous = JSON.stringify(body.previous ?? null);
    if (!edits || previous.length > 20000 || !body.previous || typeof body.previous !== "object") return json({ error: "bad_request" }, 400);
    change = { edits, previous };
  }

  // Spending guard: per visitor and overall, per day.
  const limited = await checkLimits(request, env);
  if (limited) return json({ error: limited }, 429);

  const deals = await readDeals(env, request);
  const prompt = buildPrompt(profile, days, deals, change);

  const upstream = await fetch(env.ANTHROPIC_URL || "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.MODEL || "claude-sonnet-5-5",
      max_tokens: 12000,
      // Writing a menu doesn't need long up-front reasoning: skip it so menus are
      // faster and cheaper, and the whole token budget goes to the menu itself.
      thinking: { type: "between_tools" },
      output_config: { effort: "medium" },
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error("Claude API error", upstream.status, await upstream.text().catch(() => ""));
    return json({ error: upstream.status === 429 ? "busy" : "ai_error" }, 502);
  }

  // Turn Claude's event stream into a plain text stream for the browser.
  const { readable, writable } = new TransformStream();
  // Keep the Worker alive until the whole menu has streamed through.
  ctx.waitUntil(pipeText(upstream.body, writable));
  return new Response(readable, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

async function pipeText(body, writable) {
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        let evt;
        try { evt = JSON.parse(line.slice(5)); } catch { continue; }
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
          await writer.write(enc.encode(evt.delta.text));
        } else if (evt.type === "error") {
          // Tell the browser the stream broke, so it can say so instead of failing silently.
          console.error("Claude stream error", JSON.stringify(evt.error));
          await writer.write(enc.encode(`\n<<STREAM_ERROR:${evt.error?.type || "unknown"}>>`));
        } else if (evt.type === "message_delta" && evt.delta?.stop_reason && evt.delta.stop_reason !== "end_turn") {
          console.error("Claude stopped early", evt.delta.stop_reason);
          await writer.write(enc.encode(`\n<<STREAM_ERROR:${evt.delta.stop_reason}>>`));
        }
      }
    }
  } catch (err) {
    console.error("stream error", err);
  } finally {
    await writer.close().catch(() => {});
  }
}

async function checkLimits(request, env) {
  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const ipKey = `count:${day}:${await hash(ip)}`;
  const allKey = `count:${day}:all`;
  const perIp = Number(env.MENUS_PER_VISITOR_PER_DAY || 10);
  const total = Number(env.MENUS_PER_DAY_TOTAL || 100);

  const [ipCount, allCount] = await Promise.all([env.MENU_KV.get(ipKey), env.MENU_KV.get(allKey)]);
  if (Number(allCount || 0) >= total) return "daily_limit_all";
  if (Number(ipCount || 0) >= perIp) return "daily_limit";

  const ttl = { expirationTtl: 60 * 60 * 48 };
  await Promise.all([
    env.MENU_KV.put(ipKey, String(Number(ipCount || 0) + 1), ttl),
    env.MENU_KV.put(allKey, String(Number(allCount || 0) + 1), ttl),
  ]);
  return null;
}

async function hash(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
