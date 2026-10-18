import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeGoal, sanitizeGoals, goalStatus, sortedGoals, addGoal, MAX_GOALS } from "../js/goals.js";
import { skillStats } from "../js/stats.js";
import { defaultState, sanitizeState, parseBackup, exportJSON, mergeStates, replaceState } from "../js/store.js";
import { session } from "./helpers.js";

const goal = (o = {}) => sanitizeGoal({ id: "g1", skillId: "waltz", target: 4, date: "", created: "2026-10-01", ...o });
const stats = (...sessions) => skillStats(sessions);
const rate = (date, n, skillId = "waltz") => session(date, { stars: { [skillId]: n } });

test("a goal is cleaned: it needs an id and a skill, the target is 1 to 5 (4 if unclear), the date is a real day", () => {
  assert.deepEqual(goal(), { id: "g1", skillId: "waltz", target: 4, date: "", created: "2026-10-01" });
  assert.equal(sanitizeGoal({ skillId: "waltz" }), null);
  assert.equal(sanitizeGoal({ id: "x" }), null);
  assert.equal(sanitizeGoal(null), null);
  assert.equal(sanitizeGoal("goal"), null);
  assert.equal(goal({ target: 9 }).target, 4);
  assert.equal(goal({ target: "5" }).target, 4);
  assert.equal(goal({ target: 3 }).target, 3);
  assert.equal(goal({ date: "2026-02-31" }).date, "");
  assert.equal(goal({ date: "2026-12-01" }).date, "2026-12-01");
  assert.equal(goal({ skillId: "x".repeat(500) }).skillId.length, 120);
});

test("a list of goals has no repeated ids and a limit", () => {
  const many = Array.from({ length: 80 }, (_, i) => ({ id: "g" + i, skillId: "s" + i }));
  assert.equal(sanitizeGoals(many).length, MAX_GOALS);
  assert.deepEqual(sanitizeGoals([{ id: "a", skillId: "x" }, { id: "a", skillId: "y" }, null, 5]).map((g) => g.skillId), ["x"]);
  assert.deepEqual(sanitizeGoals(undefined), []);
});

test("a goal is met by the latest rating, not the best one, and remembers the day it was reached", () => {
  const g = goal({ created: "2026-10-01" });
  const none = goalStatus(g, stats(), "2026-10-17");
  assert.deepEqual([none.latest, none.met, none.pct, none.tried, none.metOn], [0, false, 0, false, null]);
  const part = goalStatus(g, stats(rate("2026-10-03", 2)), "2026-10-17");
  assert.deepEqual([part.latest, part.met, part.pct, part.tried], [2, false, 50, true]);
  const reached = goalStatus(g, stats(rate("2026-10-03", 2), rate("2026-10-10", 4), rate("2026-10-12", 5)), "2026-10-17");
  assert.deepEqual([reached.met, reached.metOn, reached.pct], [true, "2026-10-10", 100]);
  const slipped = goalStatus(g, stats(rate("2026-10-10", 5), rate("2026-10-12", 3)), "2026-10-17");
  assert.deepEqual([slipped.met, slipped.best, slipped.latest], [false, 5, 3], "a bad day takes it back, as it does for a test");
});

test("a rating from before the goal was set does not count as the day it was reached", () => {
  const g = goal({ created: "2026-10-10" });
  const st = stats(rate("2026-10-03", 4));
  const s = goalStatus(g, st, "2026-10-17");
  assert.deepEqual([s.met, s.metOn], [true, "2026-10-10"], "already there when the goal was set: met on the day it was set");
  const later = goalStatus(g, stats(rate("2026-10-03", 4), rate("2026-10-14", 4)), "2026-10-17");
  assert.equal(later.metOn, "2026-10-14");
});

test("the countdown and overdue", () => {
  const g = goal({ date: "2026-10-29" });
  const s = goalStatus(g, stats(rate("2026-10-03", 2)), "2026-10-17");
  assert.deepEqual([s.countdown.label, s.overdue], ["12 days", false]);
  const late = goalStatus(g, stats(rate("2026-10-03", 2)), "2026-11-02");
  assert.deepEqual([late.countdown.label, late.overdue], ["Passed", true]);
  const metLate = goalStatus(g, stats(rate("2026-10-20", 4)), "2026-11-02");
  assert.equal(metLate.overdue, false, "a goal that was met is never overdue");
  assert.equal(goalStatus(goal(), stats(), "2026-10-17").countdown, null);
});

test("goals are listed with the open ones first (soonest date, then closest to done) and the met ones last", () => {
  const goals = [
    goal({ id: "a", skillId: "a", date: "2026-12-01" }),
    goal({ id: "b", skillId: "b", date: "2026-11-01" }),
    goal({ id: "c", skillId: "c", date: "" }),
    goal({ id: "d", skillId: "d", date: "2026-11-01" }),
    goal({ id: "e", skillId: "e", date: "2026-11-01", created: "2026-10-01" }),
  ];
  const st = stats(rate("2026-10-03", 3, "d"), rate("2026-10-04", 5, "e"), rate("2026-10-05", 1, "b"));
  assert.deepEqual(sortedGoals(goals, st, "2026-10-17").map((g) => g.id), ["d", "b", "a", "c", "e"]);
  const twoMet = [goal({ id: "x", skillId: "x" }), goal({ id: "y", skillId: "y" })];
  const st2 = stats(rate("2026-10-05", 4, "x"), rate("2026-10-09", 4, "y"));
  assert.deepEqual(sortedGoals(twoMet, st2, "2026-10-17").map((g) => g.id), ["y", "x"], "the most recently met first");
});

test("adding a goal: one goal per skill, a repeat does nothing, and the list has a limit", () => {
  const first = addGoal([], { skillId: "waltz", target: 4, date: "2026-12-01" }, "g1", "2026-10-17");
  assert.equal(first.status, "added");
  assert.deepEqual(first.goals[0], { id: "g1", skillId: "waltz", target: 4, date: "2026-12-01", created: "2026-10-17" });
  assert.equal(addGoal(first.goals, { skillId: "waltz", target: 4, date: "2026-12-01" }, "g2", "2026-10-18").status, "already");
  const changed = addGoal(first.goals, { skillId: "waltz", target: 5, date: "" }, "g3", "2026-10-20");
  assert.deepEqual([changed.status, changed.goals.length, changed.goals[0].id, changed.goals[0].target, changed.goals[0].created], ["updated", 1, "g1", 5, "2026-10-20"], "same goal, new target, starting from today");
  assert.equal(first.goals[0].target, 4, "the old list is not changed");
  assert.equal(addGoal([], { skillId: "", target: 4 }, "g", "2026-10-17").status, "invalid");
  const full = Array.from({ length: MAX_GOALS }, (_, i) => goal({ id: "g" + i, skillId: "s" + i }));
  assert.equal(addGoal(full, { skillId: "new", target: 4 }, "n", "2026-10-17").status, "full");
  assert.equal(addGoal(full, { skillId: "s1", target: 5 }, "n", "2026-10-17").status, "updated", "a full list can still change a goal");
});

test("goals are saved with your data, cleaned, merged without doubling a skill, and old backups load", () => {
  const state = defaultState();
  state.goals = [goal({ id: "a", skillId: "waltz", date: "2026-12-01" })];
  const back = parseBackup(exportJSON(state)).state;
  assert.deepEqual(back.goals, state.goals);
  assert.deepEqual(sanitizeState({ goals: [{ id: "a", skillId: "x", target: 99 }, "junk"] }).goals.map((g) => g.target), [4]);
  const old = JSON.parse(exportJSON(state));
  delete old.goals;
  assert.deepEqual(parseBackup(JSON.stringify(old)).state.goals, []);
  const mine = defaultState();
  mine.goals = [goal({ id: "m", skillId: "waltz", target: 5 })];
  const theirs = defaultState();
  theirs.goals = [goal({ id: "t1", skillId: "waltz", target: 3 }), goal({ id: "t2", skillId: "salchow" })];
  assert.deepEqual(mergeStates(mine, theirs).state.goals.map((g) => [g.skillId, g.target]), [["waltz", 5], ["salchow", 4]]);
  assert.deepEqual(replaceState({ ...theirs, profile: { ...theirs.profile, onboarded: true } }, mine).goals.map((g) => g.id), ["t1", "t2"]);
});
