/* Your week as a figure eight. Each session you skate traces one loop; when the eight is whole, the week counts toward your streak.
   Two circles touch in the middle: the first loop runs counterclockwise, the second clockwise, like the figures skaters
   once traced on the ice. Pure logic, no page code. */

import { weekKey, addDays } from "./util.js";

/* The radius of each loop, in the picture's own units. */
export const EIGHT_R = 72;

/* The + 0 turns a negative zero into a plain zero. */
const round1 = (n) => Math.round(n * 10) / 10 + 0;

/* Where the blade is after tracing `fraction` (0 to 1) of the eight, measured from the middle. 0.5 is the middle again, with the
   first loop whole; 1 is the middle with both loops whole. Up is negative y, as on a screen. */
export function eightPoint(fraction, r = EIGHT_R) {
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const u = f * 2;
  if (u <= 1) {
    const t = u * 2 * Math.PI;
    return { x: round1(-r + r * Math.cos(t)), y: round1(-r * Math.sin(t)) };
  }
  const t = (u - 1) * 2 * Math.PI;
  return { x: round1(r - r * Math.cos(t)), y: round1(-r * Math.sin(t)) };
}

/* The sessions in the week (Monday to Sunday) that today falls in, oldest first. */
export function weekSessions(sessions, todayIso) {
  const start = weekKey(todayIso);
  const end = addDays(start, 6);
  return sessions.filter((s) => s.date >= start && s.date <= end).sort((a, b) => (a.startedAt || a.date).localeCompare(b.startedAt || b.date) || a.date.localeCompare(b.date));
}

/* What the picture needs: how much of the eight is traced, and the sessions behind the first two loops. */
export function weekEight(sessions, todayIso, needed) {
  const list = weekSessions(sessions, todayIso);
  const n = Math.max(1, Math.round(needed) || 1);
  return {
    count: list.length,
    needed: n,
    fraction: Math.min(1, list.length / n),
    complete: list.length >= n,
    hours: list.reduce((sum, s) => sum + s.onIceSec / 3600, 0),
    loops: [list[0] || null, list[1] || null],
    weekStart: weekKey(todayIso),
  };
}

/* The little row of eights under the big one: one gold eight for each week in a row (up to max), then a ghost for this week
   if it is not whole yet. */
export function streakEights(weeks, complete, max = 8) {
  const out = Array.from({ length: Math.min(Math.max(0, weeks), max) }, () => "done");
  if (!complete) out.push("ghost");
  return out;
}

/* The seven days of this week as ticket stubs: the day's letter, its number, whether you skated, and whether it is today. */
export function weekStubs(sessions, todayIso) {
  const start = weekKey(todayIso);
  const skated = new Set(sessions.map((s) => s.date));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { letter: "MTWTFSS"[i], day: Number(date.slice(8)), date, done: skated.has(date), today: date === todayIso };
  });
}
