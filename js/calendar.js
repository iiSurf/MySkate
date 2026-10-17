/* The practice calendar: a month of days, with the days you skated and the ice you have picked for the days ahead.
   Weeks start on Monday, like everywhere in MySkate. Pure logic, no page code. */

import { addDays, weekKey, todayISO, parseISODate } from "./util.js";
import { occurrencesInWeek } from "./ice.js";
import { STREAK_MIN } from "./xp.js";

/* "2026-10" moved by delta months. */
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  return todayISO(new Date(y, m - 1 + delta, 1)).slice(0, 7);
}

/* The picked Ice sessions that have not happened yet, by day: { "2026-10-20": 2, ... } for the days between from and to. */
export function plannedByDay(iceSessions, from, to, today = todayISO()) {
  const picks = iceSessions.filter((s) => s.pick);
  const out = {};
  if (!picks.length) return out;
  for (let wk = weekKey(from); wk <= to; wk = addDays(wk, 7)) {
    for (const o of occurrencesInWeek(picks, wk)) {
      if (o.date >= from && o.date <= to && o.date >= today) out[o.date] = (out[o.date] || 0) + 1;
    }
  }
  return out;
}

/* One month as rows of seven days (a null for a day that belongs to the next or last month). Each day has: date, day (1 to 31),
   today, sessions (how many you skated), minutes on ice, and planned (picked ice still to come). A week is marked streak when
   it has enough sessions to count toward a weekly streak. ym is "YYYY-MM". */
export function monthGrid(ym, { sessions, iceSessions = [] }, today = todayISO()) {
  const first = `${ym}-01`;
  const [y, m] = ym.split("-").map(Number);
  const last = todayISO(new Date(y, m, 0));
  const planned = plannedByDay(iceSessions, first, last, today);
  const byDate = new Map();
  const perWeek = new Map();
  for (const s of sessions) {
    const d = byDate.get(s.date) || { sessions: 0, minutes: 0 };
    d.sessions += 1;
    d.minutes += (s.onIceSec || 0) / 60;
    byDate.set(s.date, d);
    perWeek.set(weekKey(s.date), (perWeek.get(weekKey(s.date)) || 0) + 1);
  }
  const lead = (parseISODate(first).getDay() + 6) % 7;
  const cells = Array(lead).fill(null);
  for (let date = first; date <= last; date = addDays(date, 1)) {
    const d = byDate.get(date) || { sessions: 0, minutes: 0 };
    cells.push({ date, day: Number(date.slice(8)), today: date === today, sessions: d.sessions, minutes: Math.round(d.minutes), planned: planned[date] || 0 });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    const any = row.find(Boolean);
    weeks.push({ days: row, streak: (perWeek.get(weekKey(any.date)) || 0) >= STREAK_MIN });
  }
  const skated = cells.filter((c) => c && c.sessions > 0);
  return { ym, weeks, daysSkated: skated.length, sessions: skated.reduce((n, c) => n + c.sessions, 0), minutes: skated.reduce((n, c) => n + c.minutes, 0) };
}
