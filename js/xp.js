/* XP, levels, and weekly streaks. XP is worked out from the logged sessions every time, never stored,
   so merging a backup or fixing a session always gives the right total. */

import { addDays, weekKey } from "./util.js";

export const STREAK_MIN = 2;

export const XP = {
  session: 20,
  perMinute: 1,
  minuteCap: 180,
  perSkill: 5,
  personalBest: 10,
  firstFour: 25,
  firstFive: 50,
  streakWeek: 30,
};

/* Level n to n+1 costs 100 + 50 * (n - 1). */
export const levelCost = (n) => 100 + 50 * (n - 1);

export function levelFromXp(total) {
  let level = 1;
  let rest = Math.max(0, Math.floor(total));
  while (rest >= levelCost(level)) {
    rest -= levelCost(level);
    level += 1;
  }
  const need = levelCost(level);
  return { level, into: rest, need, pct: Math.round((rest / need) * 100), total: Math.max(0, Math.floor(total)) };
}

/* Replay every session in order. Returns the total and, for each session, what it earned and why. */
export function replayXp(sessions) {
  const sorted = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const best = new Map();
  const reachedFour = new Set();
  const reachedFive = new Set();
  const weekCounts = new Map();
  const bonusWeeks = new Set();
  const bySession = new Map();
  let total = 0;

  for (const s of sorted) {
    const parts = [{ label: "Session logged", xp: XP.session }];
    const mins = Math.min(XP.minuteCap, Math.floor((s.onIceSec || 0) / 60));
    if (mins > 0) parts.push({ label: `${mins} min on ice`, xp: mins * XP.perMinute });

    let practiced = 0;
    let pbs = 0;
    let fours = 0;
    let fives = 0;
    for (const e of s.entries || []) {
      if (!(e.stars > 0 || e.attempts > 0)) continue;
      practiced += 1;
      if (e.stars > 0) {
        const prev = best.get(e.skillId) || 0;
        if (prev > 0 && e.stars > prev) pbs += 1;
        if (e.stars >= 4 && !reachedFour.has(e.skillId)) {
          reachedFour.add(e.skillId);
          fours += 1;
        }
        if (e.stars >= 5 && !reachedFive.has(e.skillId)) {
          reachedFive.add(e.skillId);
          fives += 1;
        }
        best.set(e.skillId, Math.max(prev, e.stars));
      }
    }
    if (practiced) parts.push({ label: `${practiced} ${practiced === 1 ? "skill" : "skills"} practiced`, xp: practiced * XP.perSkill });
    if (pbs) parts.push({ label: `${pbs} personal ${pbs === 1 ? "best" : "bests"}`, xp: pbs * XP.personalBest });
    if (fours) parts.push({ label: `${fours} new at 4 skates`, xp: fours * XP.firstFour });
    if (fives) parts.push({ label: `${fives} new at 5 skates`, xp: fives * XP.firstFive });

    const wk = weekKey(s.date);
    const count = (weekCounts.get(wk) || 0) + 1;
    weekCounts.set(wk, count);
    if (count >= STREAK_MIN && !bonusWeeks.has(wk) && (weekCounts.get(addDays(wk, -7)) || 0) >= STREAK_MIN) {
      bonusWeeks.add(wk);
      parts.push({ label: "Weekly streak", xp: XP.streakWeek });
    }

    const xp = parts.reduce((sum, p) => sum + p.xp, 0);
    bySession.set(s.id, { xp, parts });
    total += xp;
  }
  return { total, bySession };
}

/* Consecutive weeks with at least STREAK_MIN sessions. The current week counts once it qualifies,
   and does not break the streak while it is still in progress. */
export function streakWeeks(sessions, todayIso) {
  const counts = new Map();
  for (const s of sessions) counts.set(weekKey(s.date), (counts.get(weekKey(s.date)) || 0) + 1);
  const thisWeek = weekKey(todayIso);
  let wk = thisWeek;
  let weeks = 0;
  if ((counts.get(wk) || 0) >= STREAK_MIN) weeks += 1;
  wk = addDays(wk, -7);
  while ((counts.get(wk) || 0) >= STREAK_MIN) {
    weeks += 1;
    wk = addDays(wk, -7);
  }
  return { weeks, thisWeek: counts.get(thisWeek) || 0, needed: STREAK_MIN };
}

/* XP earned per day for the last 7 days ending today, oldest first. */
export function weekBars(sessions, bySession, todayIso) {
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(todayIso, -i));
  return days.map((day) => {
    let xp = 0;
    for (const s of sessions) if (s.date === day && bySession.has(s.id)) xp += bySession.get(s.id).xp;
    return { day, xp };
  });
}
