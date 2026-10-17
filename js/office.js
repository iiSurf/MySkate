/* The off-ice log: stretching, strength, jump drills, dance, and cardio away from the rink. It does not change XP or your
   weekly streak (those are for ice time); it counts toward badges and shows on the calendar. Pure logic, no page code. */

import { isDay } from "./ice.js";
import { addDays, todayISO, weekKey } from "./util.js";

export const OFF_KINDS = [
  { id: "stretch", name: "Stretching" },
  { id: "strength", name: "Strength" },
  { id: "jumps", name: "Jump drills" },
  { id: "dance", name: "Dance or ballet" },
  { id: "cardio", name: "Cardio" },
  { id: "other", name: "Other" },
];
export const OFF_KIND_IDS = OFF_KINDS.map((k) => k.id);
export const offKindName = (id) => (OFF_KINDS.find((k) => k.id === id) || OFF_KINDS[OFF_KINDS.length - 1]).name;
export const MAX_OFFICE = 1000;
export const MIN_MIN = 5;
export const MAX_MIN = 300;
export const MAX_NOTE = 200;

/* One off-ice workout, cleaned. Returns null when it has no id, no real day, or no sensible number of minutes. */
export function sanitizeOffIce(e) {
  if (!e || typeof e !== "object") return null;
  const id = typeof e.id === "string" ? e.id.trim().slice(0, 80) : "";
  if (!id || !isDay(e.date) || !Number.isFinite(e.minutes)) return null;
  const minutes = Math.round(e.minutes);
  if (minutes < MIN_MIN || minutes > MAX_MIN) return null;
  return {
    id,
    date: e.date,
    kind: OFF_KIND_IDS.includes(e.kind) ? e.kind : "other",
    minutes,
    note: typeof e.note === "string" ? e.note.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, MAX_NOTE) : "",
  };
}

export function sanitizeOffIceList(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map(sanitizeOffIce)
    .filter((e) => e && !seen.has(e.id) && seen.add(e.id))
    .slice(0, MAX_OFFICE);
}

/* Add a workout. status: "added", "invalid" (not a real day, or minutes outside 5 to 300), "future" (a day that has not come), or
   "full". Returns a new list. */
export function addOffIce(list, { date, kind, minutes, note = "" }, id, today = todayISO()) {
  const e = sanitizeOffIce({ id, date, kind, minutes: typeof minutes === "string" ? Number(minutes) : minutes, note });
  if (!e) return { list, status: "invalid" };
  if (e.date > today) return { list, status: "future" };
  if (list.length >= MAX_OFFICE) return { list, status: "full" };
  return { list: [...list, e], status: "added" };
}

/* Newest first. */
export const recentOffIce = (list) => [...list].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

/* This week (Monday to Sunday) and in all. */
export function offIceSummary(list, today = todayISO()) {
  const start = weekKey(today);
  const end = addDays(start, 6);
  const week = list.filter((e) => e.date >= start && e.date <= end);
  return {
    weekCount: week.length,
    weekMin: week.reduce((n, e) => n + e.minutes, 0),
    allCount: list.length,
    allMin: list.reduce((n, e) => n + e.minutes, 0),
    kinds: new Set(list.map((e) => e.kind)).size,
  };
}

/* The workouts on each day, for the calendar: { "2026-10-15": [entry, ...] }. */
export function offIceByDay(list) {
  const out = {};
  for (const e of list) (out[e.date] = out[e.date] || []).push(e);
  return out;
}

/* The days badges are earned on: the first workout, the tenth, and the day a third different kind was logged. */
export function offIceMilestones(list) {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const kinds = new Set();
  let kindsDay = null;
  for (const e of sorted) {
    kinds.add(e.kind);
    if (kinds.size >= 3 && !kindsDay) kindsDay = e.date;
  }
  return { first: sorted[0] ? sorted[0].date : null, tenth: sorted[9] ? sorted[9].date : null, threeKinds: kindsDay, count: sorted.length, kinds: kinds.size };
}
