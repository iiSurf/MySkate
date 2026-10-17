/* Ice times: rinks, the weekly sessions you copy from their schedules, the week view, My picks,
   and calendar (.ics) import and export. Pure logic with no page code, so it can be tested.

   Weekdays are numbered like the ISO calendar: 1 is Monday and 7 is Sunday. Times are plain
   wall-clock "HH:MM" strings, because a rink's schedule is always in the rink's own local time. */

import { addDays, weekKey, parseISODate, todayISO } from "./util.js";

export const KINDS = [
  { id: "freestyle", name: "Freestyle" },
  { id: "public", name: "Public skate" },
  { id: "stick", name: "Stick and puck" },
  { id: "learn", name: "Learn to skate" },
  { id: "adult", name: "Adult skate" },
  { id: "other", name: "Other" },
];
export const KIND_IDS = KINDS.map((k) => k.id);
export const kindName = (id) => (KINDS.find((k) => k.id === id) || KINDS[KINDS.length - 1]).name;

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ICS_DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

/* A few soft colors that tell rinks apart on the week page. */
export const RINK_COLORS = ["#5fd8e6", "#ffd98a", "#ffb98a", "#b9a6ff", "#ff9f9f", "#9ee6b0"];

export const LIMITS = { rinks: 20, sessions: 500, name: 60, city: 60, url: 300, note: 200, price: 999, importEvents: 300 };

const pad = (n) => String(n).padStart(2, "0");

/* ---------- Times and dates ---------- */

export const isTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const durationMin = (s) => toMin(s.end) - toMin(s.start);

/* A real calendar day written YYYY-MM-DD (not 2026-02-31). */
export function isDay(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return todayISO(parseISODate(v)) === v;
}

/* 1 for Monday up to 7 for Sunday. */
export const isoWeekday = (iso) => ((parseISODate(iso).getDay() + 6) % 7) + 1;

export function fmtTime(t) {
  const m = toMin(t);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h % 12 || 12}${mm ? ":" + pad(mm) : ""} ${h < 12 ? "AM" : "PM"}`;
}

/* "2:30 to 3:30 PM", or "11:30 AM to 12:30 PM" when the two ends differ in AM or PM. */
export function fmtRange(start, end) {
  const a = fmtTime(start);
  const b = fmtTime(end);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a} – ${b}`;
}

/* ---------- Cleaning anything that comes from storage or a file ---------- */

const text = (v, max, fallback = "") => (typeof v === "string" ? v.trim().slice(0, max) : fallback);
const safeUrl = (v) => (typeof v === "string" && /^https?:\/\/[^\s]+$/i.test(v.trim()) ? v.trim().slice(0, LIMITS.url) : "");

export function sanitizeRink(r) {
  if (!r || typeof r !== "object") return null;
  const id = text(r.id, 80);
  const name = text(r.name, LIMITS.name);
  if (!id || !name) return null;
  return { id, name, city: text(r.city, LIMITS.city), url: safeUrl(r.url), color: RINK_COLORS.includes(r.color) ? r.color : RINK_COLORS[0] };
}

/* Returns a clean session, or null when it could not mean anything (no rink, no day, times that do not add up). */
export function sanitizeIceSession(s) {
  if (!s || typeof s !== "object") return null;
  const id = text(s.id, 80);
  const rinkId = text(s.rinkId, 80);
  if (!id || !rinkId || !isTime(s.start) || !isTime(s.end) || toMin(s.end) <= toMin(s.start)) return null;
  const date = isDay(s.date) ? s.date : null;
  const days = date ? [] : [...new Set((Array.isArray(s.days) ? s.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b);
  if (!date && days.length === 0) return null;
  let from = !date && isDay(s.from) ? s.from : null;
  let to = !date && isDay(s.to) ? s.to : null;
  if (from && to && from > to) [from, to] = [null, null];
  const price = typeof s.price === "number" && Number.isFinite(s.price) ? Math.round(Math.min(LIMITS.price, Math.max(0, s.price)) * 100) / 100 : null;
  return { id, rinkId, kind: KIND_IDS.includes(s.kind) ? s.kind : "other", days, date, start: s.start, end: s.end, price, note: text(s.note, LIMITS.note), from, to, pick: s.pick === true };
}

export const defaultIceView = () => ({ kinds: [], rinkIds: [], picksOnly: false });

export function sanitizeIceView(v) {
  const src = v && typeof v === "object" ? v : {};
  return {
    kinds: [...new Set((Array.isArray(src.kinds) ? src.kinds : []).filter((k) => KIND_IDS.includes(k)))],
    rinkIds: [...new Set((Array.isArray(src.rinkIds) ? src.rinkIds : []).map((x) => text(x, 80)).filter(Boolean))].slice(0, LIMITS.rinks),
    picksOnly: src.picksOnly === true,
  };
}

/* The next color on the palette that no rink uses yet (and around again after that). */
export function nextRinkColor(rinks) {
  const used = new Set(rinks.map((r) => r.color));
  return RINK_COLORS.find((c) => !used.has(c)) || RINK_COLORS[rinks.length % RINK_COLORS.length];
}

/* ---------- The week ---------- */

export const weekDates = (weekStart) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

const occurrence = (s, date) => ({ key: `${s.id}@${date}`, sessionId: s.id, rinkId: s.rinkId, kind: s.kind, date, start: s.start, end: s.end, price: s.price, note: s.note, pick: s.pick });
const byTime = (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.rinkId.localeCompare(b.rinkId);

/* Every session that happens in the week starting on this Monday, as dated items in time order. */
export function occurrencesInWeek(sessions, weekStart) {
  const last = addDays(weekStart, 6);
  const out = [];
  for (const s of sessions) {
    if (s.date) {
      if (s.date >= weekStart && s.date <= last) out.push(occurrence(s, s.date));
      continue;
    }
    for (const d of s.days) {
      const date = addDays(weekStart, d - 1);
      if ((s.from && date < s.from) || (s.to && date > s.to)) continue;
      out.push(occurrence(s, date));
    }
  }
  return out.sort(byTime);
}

/* view: { kinds, rinkIds, picksOnly }. An empty list means "all of them". */
export function filterOccurrences(occs, view) {
  const v = sanitizeIceView(view);
  return occs.filter((o) => (!v.kinds.length || v.kinds.includes(o.kind)) && (!v.rinkIds.length || v.rinkIds.includes(o.rinkId)) && (!v.picksOnly || o.pick));
}

/* Picked sessions that overlap another picked session on the same day. Returns a Map from an item's key to the items it clashes with. */
export function pickClashes(occs) {
  const picks = occs.filter((o) => o.pick);
  const clashes = new Map();
  for (const a of picks) {
    for (const b of picks) {
      if (a.key !== b.key && a.date === b.date && a.start < b.end && b.start < a.end) {
        if (!clashes.has(a.key)) clashes.set(a.key, []);
        clashes.get(a.key).push(b);
      }
    }
  }
  return clashes;
}

/* The next picked sessions from now on (one that is on right now still counts). */
export function upcomingPicks(sessions, now = new Date(), count = 3, horizonDays = 14) {
  const picks = sessions.filter((s) => s.pick);
  if (!picks.length) return [];
  const today = todayISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const lastDay = addDays(today, horizonDays - 1);
  const weeks = new Set();
  for (let i = 0; i < horizonDays; i++) weeks.add(weekKey(addDays(today, i)));
  return [...weeks]
    .flatMap((w) => occurrencesInWeek(picks, w))
    .filter((o) => o.date >= today && o.date <= lastDay && (o.date > today || toMin(o.end) > nowMin))
    .sort(byTime)
    .slice(0, count);
}

/* An ice slot (in minutes, steps of 5) that fits a session. */
export const slotFor = (s) => Math.min(300, Math.max(5, Math.round(durationMin(s) / 5) * 5));

/* ---------- Reading a calendar file (.ics) ---------- */

/* Which kind of session a calendar title sounds like. */
export function guessKind(title) {
  const t = String(title || "").toLowerCase();
  if (/stick|puck/.test(t)) return "stick";
  if (/free ?style|free ?skate|freeskate|figure|\bfs\b/.test(t)) return "freestyle";
  if (/learn|\blts\b|lesson|class|beginner|snowplow|basic skills/.test(t)) return "learn";
  if (/adult/.test(t)) return "adult";
  if (/public|open skate|open session|general|family|all ages/.test(t)) return "public";
  return "other";
}

const unfold = (raw) => String(raw).replace(/\r\n|\r/g, "\n").replace(/\n[ \t]/g, "");
const unescapeText = (v) => v.replace(/\\[nN]/g, " ").replace(/\\([,;\\])/g, "$1");

function parseLine(line) {
  const i = line.indexOf(":");
  if (i < 1) return null;
  const [name] = line.slice(0, i).split(";");
  return { name: name.toUpperCase(), value: line.slice(i + 1).trim() };
}

/* A date or date-time from a calendar file. Times ending in Z are UTC and become local time. Others are read as they are written. */
function parseStamp(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value);
  if (!m) return null;
  let [y, mo, d, h, mi] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] || 0), Number(m[5] || 0)];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  if (m[7]) {
    const local = new Date(Date.UTC(y, mo - 1, d, h, mi));
    [y, mo, d, h, mi] = [local.getFullYear(), local.getMonth() + 1, local.getDate(), local.getHours(), local.getMinutes()];
  }
  const date = `${y}-${pad(mo)}-${pad(d)}`;
  return isDay(date) ? { date, min: h * 60 + mi, allDay: m[4] === undefined } : null;
}

function parseRule(value) {
  const rule = {};
  for (const part of value.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) rule[k.toUpperCase()] = v;
  }
  return rule;
}

/* The last day of a repeating event that ends after COUNT sessions. */
function lastOfCount(startDate, days, count) {
  let seen = 0;
  for (let i = 0; i < 3700; i++) {
    const date = addDays(startDate, i);
    if (days.includes(isoWeekday(date)) && ++seen >= count) return date;
  }
  return null;
}

/* Turns calendar text into sessions. Events that are all-day, overnight, unreadable, or repeat in a way MySkate does not
   handle are counted in skipped; events that ended before today are counted in ended. Exceptions (EXDATE) are not read,
   so a holiday closure still shows. */
export function parseIcs(raw, { today = todayISO() } = {}) {
  const lines = unfold(raw).split("\n");
  const events = [];
  let cur = null;
  for (const line of lines) {
    const p = parseLine(line);
    if (line.trim().toUpperCase() === "BEGIN:VEVENT") cur = {};
    else if (line.trim().toUpperCase() === "END:VEVENT") {
      if (cur && events.length < LIMITS.importEvents) events.push(cur);
      cur = null;
    } else if (cur && p && !(p.name in cur)) cur[p.name] = p.value;
  }

  const sessions = [];
  const seen = new Set();
  let skipped = 0;
  let ended = 0;
  for (const e of events) {
    const start = e.DTSTART && parseStamp(e.DTSTART);
    if (!start || start.allDay || /CANCELLED/i.test(e.STATUS || "")) {
      skipped++;
      continue;
    }
    let endMin = null;
    if (e.DTEND) {
      const end = parseStamp(e.DTEND);
      if (end && !end.allDay && end.date === start.date) endMin = end.min;
    } else if (e.DURATION) {
      const d = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(e.DURATION);
      if (d && (d[1] || d[2])) endMin = start.min + Number(d[1] || 0) * 60 + Number(d[2] || 0);
    }
    if (endMin === null || endMin <= start.min || endMin > 24 * 60 - 1) {
      skipped++;
      continue;
    }

    const title = unescapeText(e.SUMMARY || "").trim();
    /* MySkate's own files title a session "Freestyle at <rink>", which says nothing a card does not already show. */
    const ownTitle = new RegExp(`^(${KINDS.map((k) => k.name).join("|")}) at `, "i").test(title);
    const base = { kind: guessKind(title), start: fromMin(start.min), end: fromMin(endMin), price: null, note: ownTitle ? "" : title.slice(0, LIMITS.note), pick: false };
    let item;
    if (!e.RRULE) {
      item = { ...base, days: [], date: start.date, from: null, to: null };
      if (start.date < today) {
        ended++;
        continue;
      }
    } else {
      const rule = parseRule(e.RRULE);
      const interval = Number(rule.INTERVAL || 1);
      if ((rule.FREQ !== "WEEKLY" && rule.FREQ !== "DAILY") || interval !== 1) {
        skipped++;
        continue;
      }
      let days = [1, 2, 3, 4, 5, 6, 7];
      if (rule.FREQ === "WEEKLY") {
        days = rule.BYDAY ? [...new Set(rule.BYDAY.split(",").map((t) => ICS_DAYS.indexOf(t.replace(/^[+-]?\d*/, "").toUpperCase()) + 1).filter((d) => d > 0))] : [isoWeekday(start.date)];
        if (!days.length) {
          skipped++;
          continue;
        }
      }
      days.sort((a, b) => a - b);
      let to = null;
      if (rule.UNTIL) {
        const until = parseStamp(rule.UNTIL);
        to = until ? until.date : null;
      } else if (rule.COUNT && Number(rule.COUNT) > 0) {
        to = lastOfCount(start.date, days, Number(rule.COUNT));
      }
      if (to && to < today) {
        ended++;
        continue;
      }
      item = { ...base, days, date: null, from: start.date, to };
    }
    const sig = JSON.stringify([item.kind, item.days, item.date, item.start, item.end, item.from, item.to]);
    if (seen.has(sig)) continue;
    seen.add(sig);
    sessions.push(item);
  }
  return { sessions, skipped, ended, total: events.length };
}

/* ---------- Writing a calendar file (.ics) ---------- */

const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (iso) => iso.replace(/-/g, "");
const icsStamp = (iso, t) => `${icsDate(iso)}T${t.replace(":", "")}00`;

/* Lines longer than 75 bytes are split, with the rest on a line that starts with a space. */
function fold(line) {
  const enc = new TextEncoder();
  const parts = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) {
      parts.push(cur);
      cur = ch;
      bytes = 1 + b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

/* A calendar file for these sessions (usually the picked ones). Repeating sessions repeat weekly; times have no time zone,
   so they land at the same clock time wherever the calendar is. */
export function buildIcs(sessions, rinks, { now = new Date() } = {}) {
  const rinkOf = new Map(rinks.map((r) => [r.id, r]));
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const today = todayISO(now);
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MySkate//Ice times//EN", "CALSCALE:GREGORIAN"];
  for (const s of sessions) {
    const rink = rinkOf.get(s.rinkId);
    if (!rink) continue;
    let first = s.date;
    if (!first) {
      for (let i = 0; i < 400 && !first; i++) {
        const d = addDays(s.from && s.from > today ? s.from : today, i);
        if (s.days.includes(isoWeekday(d))) first = d;
      }
    }
    if (!first) continue;
    const props = ["BEGIN:VEVENT", `UID:${s.id}@myskate`, `DTSTAMP:${stamp}`, `DTSTART:${icsStamp(first, s.start)}`, `DTEND:${icsStamp(first, s.end)}`];
    if (!s.date) props.push(`RRULE:FREQ=WEEKLY;BYDAY=${s.days.map((d) => ICS_DAYS[d - 1]).join(",")}${s.to ? `;UNTIL=${icsDate(s.to)}T235959` : ""}`);
    props.push(`SUMMARY:${icsText(`${kindName(s.kind)} at ${rink.name}`)}`);
    props.push(`LOCATION:${icsText([rink.name, rink.city].filter(Boolean).join(", "))}`);
    const details = [s.note, s.price !== null ? `$${s.price}` : ""].filter(Boolean).join(" · ");
    if (details) props.push(`DESCRIPTION:${icsText(details)}`);
    if (rink.url) props.push(`URL:${rink.url}`);
    props.push("END:VEVENT");
    out.push(...props);
  }
  out.push("END:VCALENDAR");
  return out.map(fold).join("\r\n") + "\r\n";
}
