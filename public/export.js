// Export a printed menu to the person's notes app, calendar or Notion,
// using whatever the device they're on handles best.

export function device() {
  const ua = navigator.userAgent || "";
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const mac = !iOS && /Macintosh/.test(ua);
  // Apps' built-in browsers (Instagram, Facebook, LinkedIn, Gmail…) and Chrome or
  // Firefox on iPhone can't hand a calendar file to the Calendar app.
  const inApp = /FBAN|FBAV|Instagram|LinkedInApp|Line\/|Twitter|Snapchat|TikTok|GSA\/|; wv\)/.test(ua);
  const notSafariIOS = iOS && (inApp || /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua));
  return { iOS, android, mac, inApp, notSafariIOS, mobile: iOS || android, canShare: typeof navigator.share === "function" };
}

const MEALS = [
  ["Breakfast", "breakfast", [8, 0], 30],
  ["Lunch", "lunch", [12, 30], 45],
  ["Dinner", "dinner", [19, 0], 60],
];

// The dates of the menu's days.
export const menuDates = (menu) => menu.dates.map((d) => new Date(d + "T00:00:00"));

const fullDay = d => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

// ---------- text for notes apps (plain) and Notion (Markdown) ----------
export function menuText(menu, profile, money, { markdown = false } = {}) {
  const p = menu.plan, dates = menuDates(menu);
  const meals = MEALS.filter(m => profile.meals.includes(m[0]));
  const h1 = t => markdown ? `# ${t}` : t.toUpperCase();
  const h2 = t => markdown ? `## ${t}` : `\n${t.toUpperCase()}`;
  const h3 = t => markdown ? `### ${t}` : `${t}`;
  const box = markdown ? "- [ ]" : "☐";
  const bullet = markdown ? "-" : "•";
  const words = v => Array.isArray(v) ? v.join(" · ") : String(v || "");
  const out = [];

  out.push(h1(`The Menu · ${menu.weekLabel}`));
  if (p.mood) out.push(markdown ? `*${words(p.mood)}*` : words(p.mood));

  out.push(h2("Chef's picks"));
  (p.highlights || []).forEach(x => out.push(`${bullet} ${x.name} (${x.days})${x.tip ? `: ${x.tip}` : ""}`));

  out.push(h2("Your week"));
  (p.days || []).forEach((d, i) => {
    out.push(h3(dates[i] ? fullDay(dates[i]) : d.day));
    meals.forEach(([label, key]) => d[key] && d[key] !== "—" && out.push(`${bullet} ${label}: ${d[key]}`));
    if (p.snack && p.snack !== "—") out.push(`${bullet} Snack: ${p.snack}`);
  });

  out.push(h2("Shopping list"));
  let total = 0;
  (p.shopping || []).forEach(s => {
    out.push(h3(s.store));
    (s.items || []).forEach(it => {
      total += +it.price || 0;
      const tags = [it.promo && "promo", it.organic && "organic"].filter(Boolean).join(", ");
      out.push(`${box} ${it.item} — ${it.qty} · ${it.promo ? "" : "≈"}${money(it.price)}${tags ? ` (${tags})` : ""}`);
    });
  });
  out.push("", `Total ≈ ${money(total)} · budget ${money(profile.budget)}`);
  if (p.notes) out.push(p.notes);
  out.push("", `Made with The Menu · ${location.origin}`);
  return out.join("\n");
}

// ---------- calendar (.ics) ----------
const pad = n => String(n).padStart(2, "0");
const icsTime = (d, h, m) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
const icsEscape = t => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Lines over 75 octets must be folded (RFC 5545).
// Split by bytes, never inside a character, so accents and emoji stay intact.
export const fold = (line) => {
  const enc = new TextEncoder(), parts = []; let cur = "", size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; size = 0; }
    cur += ch; size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
};

export function menuICS(menu, profile) {
  const p = menu.plan, dates = menuDates(menu);
  const meals = MEALS.filter(m => profile.meals.includes(m[0]));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Menu//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:The Menu"];
  (p.days || []).forEach((d, i) => {
    const date = dates[i]; if (!date) return;
    meals.forEach(([label, key, [h, m], mins]) => {
      const what = d[key]; if (!what || what === "—") return;
      const end = new Date(date); end.setHours(h, m + mins);
      lines.push("BEGIN:VEVENT",
        `UID:the-menu-${menu.start}-${i}-${key}@the-menu`,
        `DTSTAMP:${stamp}`,
        // Floating local times: the meal happens at 19:00 wherever the person is.
        `DTSTART:${icsTime(date, h, m)}`,
        `DTEND:${icsTime(end, end.getHours(), end.getMinutes())}`,
        fold(`SUMMARY:${icsEscape(`${label}: ${what}`)}`),
        fold(`DESCRIPTION:${icsEscape(`From The Menu · ${menu.weekLabel}`)}`),
        "TRANSP:TRANSPARENT",
        "END:VEVENT");
    });
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Google Calendar can't import a file from a link, so on Android we offer one
// "add this day" link per day instead (dinner time, with the day's meals inside).
export function googleDayLinks(menu, profile) {
  const p = menu.plan, dates = menuDates(menu);
  const meals = MEALS.filter(m => profile.meals.includes(m[0]));
  return (p.days || []).map((d, i) => {
    const date = dates[i]; if (!date) return null;
    const details = meals.map(([label, key]) => d[key] && d[key] !== "—" ? `${label}: ${d[key]}` : null).filter(Boolean).join("\n");
    const q = new URLSearchParams({
      action: "TEMPLATE",
      text: `The Menu · ${d.dinner && d.dinner !== "—" ? d.dinner : d.day}`,
      dates: `${icsTime(date, 19, 0)}/${icsTime(date, 20, 0)}`,
      details,
    });
    return { label: fullDay(date), url: `https://calendar.google.com/calendar/render?${q}` };
  }).filter(Boolean);
}

// The server keeps the .ics for an hour behind a short link, and the browser
// simply opens that link. That's what iPhone and iPad need to show "Add All";
// computers download it for Apple Calendar or Outlook.
export async function openICS(ics) {
  try {
    const res = await fetch("/api/calendar", { method: "POST", headers: { "content-type": "text/calendar" }, body: ics });
    const { url } = res.ok ? await res.json() : {};
    if (url) location.href = url;
    return !!url;
  } catch { return false; }
}

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
