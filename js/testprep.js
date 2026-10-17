/* Test readiness: how ready you are for a U.S. Figure Skating test. The skating skills part is worked out from your ratings (a
   skill is earned at EARNED_AT skates or more, like everywhere else in MySkate). The free skate part is a checklist you tick
   yourself, because MySkate cannot see a jump. Pure logic, no page code. */

import { levelSkillIds } from "./catalog.js";
import { EARNED_AT } from "./stats.js";
import { daysBetween, todayISO } from "./util.js";
import { isDay } from "./ice.js";

export const SKILLS_TRACK = "usfs-skating-skills";
const MAX_CHECKS = 300;

/* Your chosen test and its date (the date is optional), cleaned. Returns null when no test is chosen. */
export function sanitizeTestGoal(g) {
  if (!g || typeof g !== "object" || typeof g.id !== "string" || !g.id.trim()) return null;
  return { id: g.id.trim().slice(0, 60), date: isDay(g.date) ? g.date : "" };
}

/* The free skate requirements you have ticked: item id to true. */
export function sanitizeChecks(c) {
  const out = {};
  if (c && typeof c === "object" && !Array.isArray(c)) {
    for (const [k, v] of Object.entries(c).slice(0, MAX_CHECKS)) if (v === true && k.length > 0 && k.length <= 80) out[k] = true;
  }
  return out;
}

/* Every test the catalog knows: the skating skills test of that name, and its free skate checklist when there is one. */
export function testList(catalog) {
  const free = new Map(((catalog && catalog.freeTests && catalog.freeTests.tests) || []).map((t) => [t.id, t]));
  return [...catalog.levels.values()]
    .filter((l) => l.trackId === SKILLS_TRACK)
    .map((l) => ({ id: l.id, name: l.name.replace(/ Skating Skills$/, ""), adult: l.id.startsWith("adult-"), levelKey: l.key, free: free.get(l.id) || null }));
}

/* Each skating skill of the test with how it has gone: the latest and best rating, the last five ratings, and whether it is earned. */
export function skillsReadiness(catalog, levelKey, stats) {
  const rows = levelSkillIds(catalog, levelKey, { bonus: true }).map((skillId) => {
    const st = stats.get(skillId);
    const rated = st ? st.history.filter((h) => h.stars > 0) : [];
    return { skillId, name: catalog.skills.get(skillId).name, latest: st ? st.latest : 0, best: st ? st.best : 0, recent: rated.slice(-5).map((h) => h.stars), tried: Boolean(st), earned: Boolean(st && st.latest >= EARNED_AT) };
  });
  const earned = rows.filter((r) => r.earned).length;
  return { rows, earned, total: rows.length, pct: rows.length ? Math.round((earned / rows.length) * 100) : 0 };
}

/* The free skate checklist, grouped (Jumps, Spins, Sequences), with what you have ticked. */
export function freeReadiness(test, checks) {
  const items = ((test && test.items) || []).map((i) => ({ ...i, done: checks[i.id] === true }));
  const groups = [];
  for (const i of items) {
    let g = groups.find((x) => x.group === i.group);
    if (!g) groups.push((g = { group: i.group, items: [] }));
    g.items.push(i);
  }
  const done = items.filter((i) => i.done).length;
  return { groups, done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/* Days to the test: null with no date, otherwise { days, label } where label is "D-12", "Tomorrow", "Today", or "Passed". */
export function countdown(date, today = todayISO()) {
  if (!isDay(date)) return null;
  const days = daysBetween(today, date);
  return { days, label: days < 0 ? "Passed" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `D-${days}` };
}

export const readinessLabel = (pct) => (pct >= 100 ? "Ready" : pct >= 75 ? "Almost there" : pct >= 40 ? "Getting there" : "Just starting");

/* The skills still to earn, the ones you have tried (lowest rating first) before the ones you have not. */
export function skillsToWorkOn(readiness) {
  return readiness.rows
    .filter((r) => !r.earned)
    .sort((a, b) => Number(b.tried) - Number(a.tried) || a.latest - b.latest)
    .map((r) => r.skillId);
}
