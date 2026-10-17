/* Progress numbers worked out from the logged sessions: per-skill history, level progress,
   what to practice next, and which skills show up on the ice. */

import { levelSkillIds, nextLevelKey } from "./catalog.js";
import { addDays, daysBetween, weekKey } from "./util.js";

export const EARNED_AT = 4;
export const STALE_DAYS = 21;
export const FRESH_DAYS = 14;

/* One record per skill: every rating in order, the latest and best, and landing totals. */
export function skillStats(sessions) {
  const map = new Map();
  const sorted = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const s of sorted) {
    for (const e of s.entries || []) {
      if (!(e.stars > 0 || e.attempts > 0)) continue;
      const m = map.get(e.skillId) || { skillId: e.skillId, history: [], latest: 0, best: 0, lastDate: null, firstDate: s.date, count: 0, landed: 0, attempts: 0 };
      m.history.push({ date: s.date, stars: e.stars, landed: e.landed, attempts: e.attempts, sessionId: s.id });
      m.count += 1;
      if (e.stars > 0) {
        m.latest = e.stars;
        m.best = Math.max(m.best, e.stars);
      }
      m.landed += e.landed;
      m.attempts += e.attempts;
      m.lastDate = s.date;
      map.set(e.skillId, m);
    }
  }
  return map;
}

/* Turn a session in progress into a pretend finished session, so live ratings show up right away. */
export function activeAsSession(active, todayIso) {
  if (!active) return null;
  return {
    id: active.id,
    date: todayIso,
    startedAt: new Date(active.startedAt).toISOString(),
    bookedMin: active.bookedMin,
    onIceSec: 0,
    entries: Object.values(active.entries),
    note: "",
  };
}

export function levelProgress(catalog, key, stats, want = () => true) {
  const ids = levelSkillIds(catalog, key).filter((id) => want(catalog.skills.get(id)));
  const earned = ids.filter((id) => ((stats.get(id) || {}).latest || 0) >= EARNED_AT).length;
  return { total: ids.length, earned, pct: ids.length ? Math.round((earned / ids.length) * 100) : 0, ids };
}

const isSkating = (sk) => sk.cat === "skills";
const isAir = (sk) => sk.cat === "jumps" || sk.cat === "spins";

function idsFor(catalog, key) {
  if (key === "library") {
    return [...catalog.levels.values()].filter((l) => l.trackId === "library").flatMap((l) => levelSkillIds(catalog, l.key));
  }
  return levelSkillIds(catalog, key);
}

function rank(catalog, ids, want, stats, todayIso) {
  const out = [];
  ids.forEach((id, order) => {
    const sk = catalog.skills.get(id);
    if (!sk || !want(sk)) return;
    const st = stats.get(id);
    if (!st || st.latest === 0) out.push({ skillId: id, reason: "New", prio: 3, rating: 0, order });
    else if (st.latest < EARNED_AT) out.push({ skillId: id, reason: "Needs work", prio: 2, rating: st.latest, order });
    else if (daysBetween(st.lastDate, todayIso) > FRESH_DAYS) out.push({ skillId: id, reason: "Keep it fresh", prio: 1, rating: st.latest, order });
  });
  return out.sort((a, b) => b.prio - a.prio || a.rating - b.rating || a.order - b.order);
}

/* What to practice next: your levels first (skating skills and jumps and spins take turns),
   then the next level once most of this one is earned or there is not enough to fill the list. */
export function suggestNext(state, catalog, stats, todayIso, count = 6) {
  const kinds = [
    { key: state.profile.levels.skills, want: isSkating },
    { key: state.profile.levels.jumps, want: isAir },
  ];
  const lists = kinds.map((k) => rank(catalog, idsFor(catalog, k.key), k.want, stats, todayIso));
  const out = [];
  const seen = new Set();
  const take = (item) => {
    if (item && !seen.has(item.skillId) && out.length < count) {
      seen.add(item.skillId);
      out.push({ skillId: item.skillId, reason: item.reason });
    }
  };
  for (let i = 0; out.length < count && lists.some((l) => i < l.length); i++) lists.forEach((l) => take(l[i]));

  kinds.forEach((k, ki) => {
    if (out.length >= count) return;
    const progress = levelProgress(catalog, k.key, stats, k.want);
    const mostlyDone = progress.total > 0 && progress.earned / progress.total >= 0.8;
    if (!mostlyDone && lists[ki].length > 0) return;
    const next = nextLevelKey(catalog, k.key);
    if (!next) return;
    rank(catalog, idsFor(catalog, next), k.want, stats, todayIso)
      .filter((item) => item.prio === 3)
      .slice(0, 3)
      .forEach((item) => take({ ...item, reason: "Next level" }));
  });
  return out;
}

/* The skills that leave marks on the ice: blue while learning, gold once earned, faint when not practiced lately. */
export function iceSkills(catalog, stats, todayIso) {
  const list = [];
  for (const st of stats.values()) {
    const sk = catalog.skills.get(st.skillId);
    if (!sk) continue;
    let state = "learning";
    if (daysBetween(st.lastDate, todayIso) > STALE_DAYS) state = "stale";
    else if (st.latest >= EARNED_AT) state = "earned";
    list.push({ id: sk.id, name: sk.name, cat: sk.cat, state, first: st.firstDate });
  }
  return list.sort((a, b) => a.first.localeCompare(b.first));
}

export function minutesOnIce(sessions, fromIso, toIso) {
  return sessions.filter((s) => s.date >= fromIso && s.date <= toIso).reduce((sum, s) => sum + s.onIceSec / 60, 0);
}

export function totals(sessions, todayIso) {
  const monthStart = todayIso.slice(0, 8) + "01";
  return {
    sessions: sessions.length,
    allMin: sessions.reduce((sum, s) => sum + s.onIceSec / 60, 0),
    weekMin: minutesOnIce(sessions, weekKey(todayIso), addDays(weekKey(todayIso), 6)),
    monthMin: minutesOnIce(sessions, monthStart, todayIso),
  };
}

export function landedPct(st) {
  return st && st.attempts > 0 ? Math.round((st.landed / st.attempts) * 100) : null;
}
