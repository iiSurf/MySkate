/* Badges: what you have earned and when. Like XP, badges are worked out from the saved sessions every time and never stored,
   so merging a backup, fixing a session, or restoring on a new phone always gives the right trophy case.
   Each badge is a goal on a running count; replaying the sessions in order finds the day each goal was first reached
   (and how many sessions and days it took). Pure logic, no page code. */

import { replayXp, levelFromXp, STREAK_MIN } from "./xp.js";
import { EARNED_AT } from "./stats.js";
import { addDays, daysBetween, todayISO, weekKey } from "./util.js";

export const GROUPS = ["On the ice", "Skills", "Jumps", "Habits", "Levels"];

/* id, group, name, text (what it takes), icon (a symbol in index.html), goal, of (the count the goal is measured on), and
   optionally scale, unit, and prefix for showing minutes as hours or "Level 2 of 3". */
export const BADGES = [
  { id: "first-session", group: "On the ice", name: "First session", text: "Save your first session.", icon: "skate", goal: 1, of: (a) => a.sessions },
  { id: "sessions-5", group: "On the ice", name: "Getting regular", text: "Save 5 sessions.", icon: "check", goal: 5, of: (a) => a.sessions },
  { id: "sessions-10", group: "On the ice", name: "Ten sessions", text: "Save 10 sessions.", icon: "check", goal: 10, of: (a) => a.sessions },
  { id: "month-10", group: "On the ice", name: "Full month", text: "Skate 10 times in one calendar month.", icon: "plan", goal: 10, of: (a) => a.monthMax },
  { id: "hour-1", group: "On the ice", name: "First hour", text: "Spend an hour on the ice, all sessions together.", icon: "chart", goal: 60, scale: 60, unit: "h", of: (a) => a.minutes },
  { id: "hours-10", group: "On the ice", name: "Ten hours", text: "Spend 10 hours on the ice.", icon: "chart", goal: 600, scale: 60, unit: "h", of: (a) => a.minutes },
  { id: "marathon", group: "On the ice", name: "Marathon", text: "Spend 26.2 hours on the ice, a marathon's worth.", icon: "up", goal: 1572, scale: 60, unit: "h", of: (a) => a.minutes },
  { id: "long-90", group: "On the ice", name: "Long haul", text: "Spend 90 minutes on the ice in one session.", icon: "play", goal: 90, unit: "min", of: (a) => a.longest },

  { id: "skill-1", group: "Skills", name: "First skill earned", text: `Rate a skill ${EARNED_AT} skates or more.`, icon: "star", goal: 1, of: (a) => a.skillsEarned },
  { id: "skill-5", group: "Skills", name: "Skill collector", text: `Earn 5 skills (${EARNED_AT} skates or more).`, icon: "star", goal: 5, of: (a) => a.skillsEarned },
  { id: "skill-10", group: "Skills", name: "Ten skills", text: `Earn 10 skills (${EARNED_AT} skates or more).`, icon: "star", goal: 10, of: (a) => a.skillsEarned },
  { id: "five-1", group: "Skills", name: "Five skates", text: "Rate a skill 5 skates.", icon: "star", goal: 1, of: (a) => a.fives },
  { id: "five-5", group: "Skills", name: "Five alive", text: "Rate 5 different skills 5 skates.", icon: "star", goal: 5, of: (a) => a.fives },
  { id: "pb-1", group: "Skills", name: "Personal best", text: "Beat your best rating on a skill.", icon: "up", goal: 1, of: (a) => a.pbs },
  { id: "pb-10", group: "Skills", name: "Climber", text: "Beat your best rating 10 times.", icon: "up", goal: 10, of: (a) => a.pbs },
  { id: "level-done", group: "Skills", name: "Level complete", text: `Earn every skill in a level (${EARNED_AT} skates or more).`, icon: "check", goal: 1, of: (a) => a.levelsDone },

  { id: "landed-10", group: "Jumps", name: "Ten landed", text: "Land 10 jumps.", icon: "skate", goal: 10, of: (a) => a.landed },
  { id: "landed-100", group: "Jumps", name: "Hundred landed", text: "Land 100 jumps.", icon: "skate", goal: 100, of: (a) => a.landed },
  { id: "dialed-in", group: "Jumps", name: "Dialed in", text: "Land 80% or more of at least 20 tries at one jump.", icon: "star", goal: 1, of: (a) => a.dialed },

  { id: "streak-2", group: "Habits", name: "Two weeks running", text: `Skate ${STREAK_MIN} or more times a week, 2 weeks in a row.`, icon: "flame", goal: 2, unit: "weeks", of: (a) => a.streak },
  { id: "streak-4", group: "Habits", name: "A month of habit", text: `Skate ${STREAK_MIN} or more times a week, 4 weeks in a row.`, icon: "flame", goal: 4, unit: "weeks", of: (a) => a.streak },
  { id: "streak-8", group: "Habits", name: "Eight weeks", text: `Skate ${STREAK_MIN} or more times a week, 8 weeks in a row.`, icon: "flame", goal: 8, unit: "weeks", of: (a) => a.streak },
  { id: "goal-1", group: "Habits", name: "Goal reached", text: "Reach a skill goal you set.", icon: "star", goal: 1, of: (a) => a.goals },
  { id: "goal-5", group: "Habits", name: "Five goals", text: "Reach 5 skill goals.", icon: "star", goal: 5, of: (a) => a.goals },
  { id: "notes-5", group: "Habits", name: "Note taker", text: "Write 5 notes about a skill or a session.", icon: "edit", goal: 5, of: (a) => a.notes },
  { id: "variety", group: "Habits", name: "All-rounder", text: "Work on a skating skill, a jump, and a spin in one session.", icon: "plus", goal: 1, of: (a) => a.variety },
  { id: "sharpened", group: "Habits", name: "Fresh edge", text: "Log a blade sharpening.", icon: "ice", goal: 1, of: (a) => a.sharpened },
  { id: "backup", group: "Habits", name: "Safe and sound", text: "Save a backup file.", icon: "check", goal: 1, of: (a) => a.backup },

  { id: "level-3", group: "Levels", name: "Level 3", text: "Reach level 3.", icon: "up", goal: 3, prefix: "Level ", of: (a) => a.level },
  { id: "level-5", group: "Levels", name: "Level 5", text: "Reach level 5.", icon: "up", goal: 5, prefix: "Level ", of: (a) => a.level },
  { id: "level-10", group: "Levels", name: "Level 10", text: "Reach level 10.", icon: "up", goal: 10, prefix: "Level ", of: (a) => a.level },
];

const practiced = (e) => e.stars > 0 || e.attempts > 0;
const filled = (t) => typeof t === "string" && t.trim() !== "";

/* Consecutive weeks, ending with the week of this date, that have at least STREAK_MIN sessions (counts: week start to sessions).
   The same answer as streakWeeks in xp.js, kept as a running count so replaying every session stays quick. */
export function streakAsOf(counts, date) {
  let weeks = 0;
  let wk = weekKey(date);
  if ((counts.get(wk) || 0) >= STREAK_MIN) weeks += 1;
  wk = addDays(wk, -7);
  while ((counts.get(wk) || 0) >= STREAK_MIN) {
    weeks += 1;
    wk = addDays(wk, -7);
  }
  return weeks;
}

/* The skills of each level you can earn, in the curriculum and test tracks (the library is a pool, not levels). */
function levelLists(catalog) {
  if (!catalog) return [];
  const kind = new Map(catalog.tracks.map((t) => [t.id, t.kind]));
  return [...catalog.levels.values()]
    .filter((l) => kind.get(l.trackId) !== "library")
    .map((l) => l.skillIds.filter((id) => !(catalog.skills.get(id) || {}).bonus))
    .filter((ids) => ids.length > 0);
}

let memo = { key: "", value: null };

/* Every badge with whether it is earned, how far along it is, and (when earned) the day, and how many sessions and days it took.
   sessions: saved sessions. sharpenings: [{ date }]. backupAt: ISO time of the last backup file, or null. goalDates: the day each
   met skill goal was reached. */
export function evaluateBadges({ sessions, sharpenings = [], backupAt = null, catalog = null, goalDates = [] }) {
  const weight = sessions.reduce((n, x) => n + x.entries.length + x.onIceSec, 0);
  const key = [sessions.length, weight, sessions.length ? sessions[sessions.length - 1].id + sessions[sessions.length - 1].startedAt : "", sharpenings.length, backupAt, catalog ? catalog.skills.size : 0, goalDates.join(",")].join("|");
  if (memo.key === key && memo.value) return memo.value;

  const sorted = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const xp = replayXp(sorted);
  const levels = levelLists(catalog);
  const sharpenedOn = sharpenings.map((s) => s.date).sort()[0] || null;
  const backupOn = backupAt && !Number.isNaN(Date.parse(backupAt)) ? todayISO(new Date(backupAt)) : null;

  const best = new Map();
  const lands = new Map();
  const fives = new Set();
  const months = new Map();
  const weeks = new Map();
  const a = { sessions: 0, minutes: 0, longest: 0, monthMax: 0, skillsEarned: 0, fives: 0, pbs: 0, levelsDone: 0, landed: 0, dialed: 0, streak: 0, notes: 0, variety: 0, sharpened: 0, backup: 0, level: 1, goals: 0 };
  const earned = new Map();
  let cumXp = 0;

  const check = (date, taken, days) => {
    for (const b of BADGES) {
      if (!earned.has(b.id) && b.of(a) >= b.goal) earned.set(b.id, { earnedOn: date, sessionsTaken: taken, daysTaken: days });
    }
  };

  sorted.forEach((s, i) => {
    a.sessions = i + 1;
    const min = (s.onIceSec || 0) / 60;
    a.minutes += min;
    a.longest = Math.max(a.longest, min);
    const month = s.date.slice(0, 7);
    months.set(month, (months.get(month) || 0) + 1);
    a.monthMax = Math.max(a.monthMax, months.get(month));
    const wk = weekKey(s.date);
    weeks.set(wk, (weeks.get(wk) || 0) + 1);
    a.streak = Math.max(a.streak, streakAsOf(weeks, s.date));

    const cats = new Set();
    for (const e of s.entries || []) {
      if (filled(e.note)) a.notes += 1;
      if (!practiced(e)) continue;
      const cat = catalog && catalog.skills.get(e.skillId) ? catalog.skills.get(e.skillId).cat : null;
      if (cat) cats.add(cat);
      if (e.stars > 0) {
        const prev = best.get(e.skillId) || 0;
        if (prev > 0 && e.stars > prev) a.pbs += 1;
        best.set(e.skillId, Math.max(prev, e.stars));
        if (e.stars >= 5) fives.add(e.skillId);
      }
      const l = lands.get(e.skillId) || { landed: 0, attempts: 0 };
      l.landed += e.landed;
      l.attempts += e.attempts;
      lands.set(e.skillId, l);
      a.landed += e.landed;
    }
    if (filled(s.note)) a.notes += 1;
    if (cats.has("skills") && cats.has("jumps") && cats.has("spins")) a.variety = 1;
    a.skillsEarned = [...best.values()].filter((v) => v >= EARNED_AT).length;
    a.fives = fives.size;
    a.levelsDone = levels.filter((ids) => ids.every((id) => (best.get(id) || 0) >= EARNED_AT)).length;
    a.dialed = [...lands.values()].some((l) => l.attempts >= 20 && l.landed / l.attempts >= 0.8) ? 1 : 0;
    const gain = xp.bySession.get(s.id);
    cumXp += gain ? gain.xp : 0;
    a.level = levelFromXp(cumXp).level;
    check(s.date, i + 1, daysBetween(sorted[0].date, s.date) + 1);
  });

  /* A sharpening, a backup, or a goal reached is not part of any session, so its badge is earned on its own day (even with no sessions at all). */
  const onDay = (date) => ({ earnedOn: date, sessionsTaken: sorted.filter((s) => s.date <= date).length, daysTaken: sorted.length ? Math.max(1, daysBetween(sorted[0].date, date) + 1) : 1 });
  const goalsMet = [...goalDates].sort();
  a.sharpened = sharpenedOn ? 1 : 0;
  a.backup = backupOn ? 1 : 0;
  a.goals = goalsMet.length;
  const dated = { sharpened: sharpenedOn, backup: backupOn, "goal-1": goalsMet[0], "goal-5": goalsMet[4] };
  for (const [id, day] of Object.entries(dated)) if (day) earned.set(id, onDay(day));

  const value = BADGES.map(({ of, ...def }) => {
    const v = of(a);
    const got = earned.get(def.id);
    return { ...def, value: v, earned: Boolean(got), earnedOn: got ? got.earnedOn : null, sessionsTaken: got ? got.sessionsTaken : null, daysTaken: got ? got.daysTaken : null };
  });
  memo = { key, value };
  return value;
}

/* The badges that are earned now but were not in this list of ids. */
export const newlyEarned = (badges, seen) => badges.filter((b) => b.earned && !seen.includes(b.id));

/* Progress as a number from 0 to 1, for the bars on badges not earned yet. */
export const badgeRatio = (b) => (b.earned ? 1 : Math.max(0, Math.min(1, b.value / b.goal)));

/* "35 of 60 min", "8.5 of 26.2 h", "3 of 5". */
export function progressText(b) {
  const scale = b.scale || 1;
  const round = (n) => Math.round((n / scale) * 10) / 10;
  return `${b.prefix || ""}${round(Math.min(b.value, b.goal))} of ${round(b.goal)}${b.unit ? " " + b.unit : ""}`;
}
