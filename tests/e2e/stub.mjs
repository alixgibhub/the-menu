// Stands in for the Claude API during browser tests.
// Writes a small menu for exactly the days the prompt asks for, using the
// prompt's first real deal as a promo item and adding one invented promo
// (which the app must strip). Modes, chosen by the file STUB_MODE in this folder:
//   "reject-schema"  answer 400 when the request carries a JSON schema
//   "empty"          answer with an empty menu
import http from "node:http";
import fs from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const mode = () => { try { return fs.readFileSync(here + "STUB_MODE", "utf8").trim(); } catch { return ""; } };
const log = (line) => fs.appendFileSync(here + "stub.log", line + "\n");

http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const r = JSON.parse(body);
    const prompt = String(r.messages[0].content);
    const structured = !!r.output_config?.format;
    log(`request structured=${structured} effort=${r.output_config?.effort} days=${(prompt.match(/only these: ([^.]+)\. Shop/) || [])[1]}`);
    if (mode() === "reject-schema" && structured) {
      res.writeHead(400, { "content-type": "application/json" });
      return res.end('{"type":"error","error":{"type":"invalid_request_error","message":"schema rejected (test)"}}');
    }
    const days = ((prompt.match(/only these: ([^.]+)\. Shop/) || [])[1] || "Mon 1").split(", ");
    const store = (prompt.match(/Supermarkets they use: ([^,\n]+)/) || [])[1] || "Lidl";
    const line = prompt.split("CURRENT PROMOTIONS")[1]?.split("\n")[1] || "";
    const deals = line.startsWith("{") ? JSON.parse(line) : {};
    const deal = (deals[store] || [])[0];
    const plan = mode() === "empty" ? { mood: [], highlights: [], days: [], snack: "—", shopping: [], notes: "" } : {
      mood: ["cosy", "frugal", "seasonal"],
      highlights: [
        { emoji: "🥕", name: "Carrots", days: "Mon & Wed", tip: "Roast hot with honey until the edges caramelise." },
        { emoji: "🫘", name: "Lentils", days: "Tue", tip: "Finish with a splash of vinegar." },
        { emoji: "🍚", name: "Rice", days: "Thu", tip: "Rinse until the water runs clear." },
        { emoji: "🥚", name: "Eggs", days: "Fri", tip: "Cook low and slow for soft eggs." },
      ],
      days: days.map((day, i) => ({ day, breakfast: "Oats with apple", lunch: "Lentil soup", dinner: `Dinner ${i + 1}` })),
      snack: "—",
      shopping: [{ store, items: [
        ...(deal ? [{ item: deal.item, deal: deal.item, qty: "1 pack", price: deal.price, promo: true, until: "2099-01-01", organic: false }] : []),
        { item: "Invented promo", qty: "1", price: 0.5, promo: true, until: "2026-01-01", organic: false },
        { item: "Red lentils", qty: "500 g", price: 1.79, promo: false, organic: false },
        { item: "Rice", qty: "1 kg", price: 1.39, promo: false, organic: false },
      ] }],
      notes: "Test menu.",
      usedUp: ((prompt.match(/Left over from last week[^:]*: ([^\n]+)/) || [])[1] || "nothing listed") === "nothing listed" ? []
        : prompt.match(/Left over from last week[^:]*: ([^\n]+)/)[1].split(", ").map((x) => x.replace(/^about \d+ g /i, "")),
      leftovers: ["About 600 g rice", "2 leeks", "Half a block of feta"],
    };
    const out = JSON.stringify(plan);
    res.writeHead(200, { "content-type": "text/event-stream" });
    for (let i = 0; i < out.length; i += 80)
      res.write(`data: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: out.slice(i, i + 80) } })}\n\n`);
    res.end();
  });
}).listen(Number(process.env.STUB_PORT || 8799));
