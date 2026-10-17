import test from "node:test";
import assert from "node:assert/strict";
import { levelCost, levelFromXp, replayXp, streakWeeks, weekBars, XP } from "../js/xp.js";
import { session } from "./helpers.js";

test("level n to n+1 costs 100 + 50 * (n - 1)", () => {
  assert.equal(levelCost(1), 100);
  assert.equal(levelCost(7), 400);
});

test("levelFromXp walks up the levels", () => {
  assert.deepEqual(levelFromXp(0), { level: 1, into: 0, need: 100, pct: 0, total: 0 });
  assert.equal(levelFromXp(99).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  // Levels 1 to 6 cost 100 + 150 + 200 + 250 + 300 + 350 = 1350.
  const seven = levelFromXp(1350 + 340);
  assert.equal(seven.level, 7);
  assert.equal(seven.into, 340);
  assert.equal(seven.need, 400);
  assert.equal(seven.pct, 85);
});

test("a first session earns the base, minutes, and skills practiced", () => {
  const s = session("2026-10-05", { onIceSec: 3600, stars: { a: 3, b: 2 } });
  const { total, bySession } = replayXp([s]);
  assert.equal(total, XP.session + 60 + 2 * XP.perSkill);
  assert.equal(bySession.get(s.id).parts[0].label, "Session logged");
});

test("on-ice minutes are capped", () => {
  const s = session("2026-10-05", { onIceSec: 6 * 3600 });
  assert.equal(replayXp([s]).total, XP.session + XP.minuteCap);
});

test("personal bests only count when a rating improves on an earlier one", () => {
  const first = session("2026-10-05", { onIceSec: 0, stars: { a: 2 } });
  const second = session("2026-10-06", { onIceSec: 0, stars: { a: 3 } });
  const { bySession } = replayXp([first, second]);
  assert.equal(bySession.get(first.id).xp, XP.session + XP.perSkill);
  assert.equal(bySession.get(second.id).xp, XP.session + XP.perSkill + XP.personalBest);
});

test("reaching 4 and 5 skates pays once per skill", () => {
  const a = session("2026-10-05", { onIceSec: 0, stars: { a: 4 } });
  const b = session("2026-10-06", { onIceSec: 0, stars: { a: 4 } });
  const c = session("2026-10-07", { onIceSec: 0, stars: { a: 5 } });
  const { bySession } = replayXp([a, b, c]);
  assert.equal(bySession.get(a.id).xp, XP.session + XP.perSkill + XP.firstFour);
  assert.equal(bySession.get(b.id).xp, XP.session + XP.perSkill);
  assert.equal(bySession.get(c.id).xp, XP.session + XP.perSkill + XP.personalBest + XP.firstFive);
});

test("attempts alone count as practice", () => {
  const s = session("2026-10-05", { onIceSec: 0, extra: [{ skillId: "j", stars: 0, landed: 2, attempts: 5, note: "" }] });
  assert.equal(replayXp([s]).total, XP.session + XP.perSkill);
});

test("the weekly streak bonus needs two qualifying weeks in a row, and pays once", () => {
  // Weeks start on Monday. Oct 5 and Oct 12, 2026 are Mondays.
  const w1a = session("2026-10-05", { onIceSec: 0 });
  const w1b = session("2026-10-07", { onIceSec: 0 });
  const w2a = session("2026-10-12", { onIceSec: 0 });
  const w2b = session("2026-10-14", { onIceSec: 0 });
  const w2c = session("2026-10-15", { onIceSec: 0 });
  const { bySession } = replayXp([w1a, w1b, w2a, w2b, w2c]);
  assert.equal(bySession.get(w1b.id).xp, XP.session, "first week has no previous week");
  assert.equal(bySession.get(w2a.id).xp, XP.session);
  assert.equal(bySession.get(w2b.id).xp, XP.session + XP.streakWeek);
  assert.equal(bySession.get(w2c.id).xp, XP.session, "paid only once per week");
});

test("streakWeeks counts consecutive qualifying weeks and forgives a week in progress", () => {
  const sessions = [
    session("2026-10-05", { onIceSec: 0 }),
    session("2026-10-07", { onIceSec: 0 }),
    session("2026-10-12", { onIceSec: 0 }),
    session("2026-10-14", { onIceSec: 0 }),
  ];
  assert.equal(streakWeeks(sessions, "2026-10-15").weeks, 2);
  // A new week with no sessions yet does not break the streak.
  assert.equal(streakWeeks(sessions, "2026-10-19").weeks, 2);
  // A whole week missed does.
  assert.equal(streakWeeks(sessions, "2026-10-27").weeks, 0);
  assert.equal(streakWeeks(sessions, "2026-10-15").thisWeek, 2);
});

test("weekBars gives seven days of XP, oldest first", () => {
  const s = session("2026-10-14", { onIceSec: 0 });
  const { bySession } = replayXp([s]);
  const bars = weekBars([s], bySession, "2026-10-15");
  assert.equal(bars.length, 7);
  assert.equal(bars[0].day, "2026-10-09");
  assert.equal(bars[5].xp, XP.session);
  assert.equal(bars[6].xp, 0);
});
