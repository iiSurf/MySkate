/* Skill goals: "get Waltz jump to 4 stars by December 1". A goal is a skill, a target rating, and an optional date.
   It is met when the skill's latest rating reaches the target. Pure logic, no page code. */

import { isDay } from "./ice.js";
import { countdown } from "./testprep.js";
import { todayISO } from "./util.js";

export const MAX_GOALS = 30;
export const TARGETS = [3, 4, 5];

/* A goal, cleaned. Returns null when it has no id or skill. created is the day it was set. */
export function sanitizeGoal(g) {
  if (!g || typeof g !== "object") return null;
  const id = typeof g.id === "string" ? g.id.trim().slice(0, 80) : "";
  const skillId = typeof g.skillId === "string" ? g.skillId.trim().slice(0, 120) : "";
  if (!id || !skillId) return null;
  const target = Number.isInteger(g.target) && g.target >= 1 && g.target <= 5 ? g.target : 4;
  return { id, skillId, target, date: isDay(g.date) ? g.date : "", created: isDay(g.created) ? g.created : todayISO() };
}

/* A list of goals, cleaned: no repeats of an id, at most MAX_GOALS. */
export function sanitizeGoals(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map(sanitizeGoal)
    .filter((g) => g && !seen.has(g.id) && seen.add(g.id))
    .slice(0, MAX_GOALS);
}

/* Where a goal stands. stats is skillStats(); today is a day. met is by the latest rating; metOn is the first day on or after the
   goal was set that the rating reached the target (or the day it was set, if it was already there). */
export function goalStatus(goal, stats, today = todayISO()) {
  const st = stats.get(goal.skillId);
  const latest = st ? st.latest : 0;
  const met = latest >= goal.target;
  let metOn = null;
  if (met) {
    const hit = st.history.find((h) => h.stars >= goal.target && h.date >= goal.created);
    metOn = hit ? hit.date : goal.created;
  }
  const cd = goal.date ? countdown(goal.date, today) : null;
  return {
    ...goal,
    latest,
    best: st ? st.best : 0,
    tried: Boolean(st),
    met,
    metOn,
    pct: Math.min(100, Math.round((latest / goal.target) * 100)),
    countdown: cd,
    overdue: !met && Boolean(cd) && cd.days < 0,
  };
}

/* Goals still to reach first (the soonest date first, then the ones closest to done), then the ones already met (latest first). */
export function sortedGoals(goals, stats, today = todayISO()) {
  const rows = goals.map((g) => goalStatus(g, stats, today));
  const open = rows.filter((r) => !r.met).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || b.pct - a.pct || a.skillId.localeCompare(b.skillId));
  const done = rows.filter((r) => r.met).sort((a, b) => b.metOn.localeCompare(a.metOn) || a.skillId.localeCompare(b.skillId));
  return [...open, ...done];
}

/* Set a goal. There is one goal for each skill, so setting one for a skill that already has a goal changes that goal's target and date
   (and starts it from today). status: "added", "updated", "already" (nothing changed), "full", or "invalid". Returns a new list. */
export function addGoal(goals, { skillId, target, date }, id, today = todayISO()) {
  const g = sanitizeGoal({ id, skillId, target, date, created: today });
  if (!g) return { goals, status: "invalid" };
  const at = goals.findIndex((x) => x.skillId === g.skillId);
  if (at >= 0) {
    if (goals[at].target === g.target && goals[at].date === g.date) return { goals, status: "already" };
    const next = [...goals];
    next[at] = { ...goals[at], target: g.target, date: g.date, created: today };
    return { goals: next, status: "updated" };
  }
  if (goals.length >= MAX_GOALS) return { goals, status: "full" };
  return { goals: [...goals, g], status: "added" };
}
