/* Ice cost: what each saved session cost, and the totals by month. A session without a cost is unknown, not free:
   a cost of 0 means it was free, and a missing cost is left out of every total and average. Pure logic, no page code. */

import { todayISO } from "./util.js";

export const COST_MAX = 999;

/* Dollars per hour is only shown once there is at least this much time on the ice behind it (15 minutes), so a session that
   was ended straight away does not make a silly rate. */
const MIN_HOURS_FOR_RATE = 0.25;

/* A cost to the cent, from a number or the text of a form field, or null when it is empty or not a sensible amount. */
export function sanitizeCost(v) {
  const n = typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= COST_MAX ? Math.round(n * 100) / 100 : null;
}

/* "$18", "$18.50", "$1,240". */
export function fmtMoney(n) {
  const r = Math.round(n * 100) / 100;
  return "$" + (Number.isInteger(r) ? r.toLocaleString("en-US") : r.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

function tally(list) {
  const costed = list.filter((s) => s.cost !== null && s.cost !== undefined);
  const total = costed.reduce((sum, s) => sum + s.cost, 0);
  const hours = costed.reduce((sum, s) => sum + s.onIceSec / 3600, 0);
  return {
    sessions: list.length,
    costed: costed.length,
    unknown: list.length - costed.length,
    total: Math.round(total * 100) / 100,
    hours: Math.round(list.reduce((sum, s) => sum + s.onIceSec / 3600, 0) * 100) / 100,
    perSession: costed.length ? Math.round((total / costed.length) * 100) / 100 : null,
    perHour: hours >= MIN_HOURS_FOR_RATE ? Math.round((total / hours) * 100) / 100 : null,
  };
}

/* The last few months, newest first (the current month is always there, even when empty). month is "YYYY-MM". */
export function costByMonth(sessions, today = todayISO(), months = 6) {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: months }, (_, i) => {
    const month = todayISO(new Date(y, m - 1 - i, 1)).slice(0, 7);
    return { month, ...tally(sessions.filter((s) => s.date.slice(0, 7) === month)) };
  });
}

/* This month and everything so far. */
export function costSummary(sessions, today = todayISO()) {
  return { thisMonth: costByMonth(sessions, today, 1)[0], all: tally(sessions) };
}
