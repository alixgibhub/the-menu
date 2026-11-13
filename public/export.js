// Export a printed menu to the person's notes app, calendar or Notion,
// using whatever the device they're on handles best.

export function device() {
  const ua = navigator.userAgent || "";
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const mac = !iOS && /Macintosh/.test(ua);
  return { iOS, android, mac, mobile: iOS || android, canShare: typeof navigator.share === "function" };
}

const MEALS = [
  ["Breakfast", "breakfast", [8, 0], 30],
  ["Lunch", "lunch", [12, 30], 45],
  ["Dinner", "dinner", [19, 0], 60],
];

// The dates of the menu's seven days.
export function menuDates(menu) {
  const start = menu.start ? new Date(menu.start + "T00:00:00") : null;
  return [...Array(7)].map((_, i) => {
    if (!start) return null;
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

const fullDay = d => d ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }) : "";

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
  (p.highlights || []).forEach(x => out.push(`${bullet} ${x.name} (${x.days}): ${words(x.keywords || x.benefit)}`));

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
const fold = line => { const parts = []; while (line.length > 70) { parts.push(line.slice(0, 70)); line = " " + line.slice(70); } parts.push(line); return parts.join("\r\n"); };

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

// Send the .ics through the server so every browser treats it as a real
// calendar file: iPhone and iPad show "Add All", computers download it for
// Apple Calendar or Outlook, Android opens it in the calendar app if it can.
export function openICS(ics) {
  const form = document.createElement("form");
  form.method = "POST"; form.action = "/api/calendar.ics"; form.style.display = "none";
  const field = document.createElement("textarea"); field.name = "ics"; field.value = ics;
  form.appendChild(field); document.body.appendChild(form);
  form.submit(); form.remove();
}

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
