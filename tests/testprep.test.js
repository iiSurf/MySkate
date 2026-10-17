import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeTestGoal, sanitizeChecks, testList, skillsReadiness, freeReadiness, countdown, readinessLabel, skillsToWorkOn } from "../js/testprep.js";
import { skillStats, EARNED_AT } from "../js/stats.js";
import { defaultState, sanitizeState, parseBackup, exportJSON, mergeStates, replaceState } from "../js/store.js";
import { realCatalog, session } from "./helpers.js";

const catalog = realCatalog();
const list = testList(catalog);
const pre = list.find((t) => t.id === "pre-preliminary");

test("every skating skills test has a free skate checklist with the same id, and the other way round", () => {
  assert.equal(list.length, 12);
  assert.ok(list.every((t) => t.free), "a test has no checklist");
  assert.equal(catalog.freeTests.tests.length, list.length);
  assert.deepEqual(list.map((t) => t.id), catalog.freeTests.tests.map((t) => t.id), "same tests, same order");
  assert.deepEqual(list.filter((t) => t.adult).map((t) => t.name), ["Adult Pre-Bronze", "Adult Bronze", "Adult Silver", "Adult Gold"]);
  assert.equal(pre.name, "Pre-preliminary", "the catalog's own spelling is used");
});

test("the checklist data is well formed: unique ids, three known groups, and words, and a time", () => {
  const ids = [];
  for (const t of catalog.freeTests.tests) {
    assert.match(t.maxTime, /^\d:\d\d$/, t.id);
    assert.ok(t.items.length >= 3, t.id);
    for (const i of t.items) {
      assert.ok(["Jumps", "Spins", "Sequences"].includes(i.group), `${t.id}: ${i.group}`);
      assert.ok(i.text.length >= 10 && i.text.length < 400, i.id);
      assert.ok(i.id.startsWith(t.id + "."), i.id);
      ids.push(i.id);
    }
    assert.ok(t.items.some((i) => i.group === "Jumps") && t.items.some((i) => i.group === "Spins") && t.items.some((i) => i.group === "Sequences" || /Connecting steps/.test(i.text)), t.id);
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.match(catalog.freeTests.note, /rulebook/i, "it tells skaters to check the current rules");
});

test("the skating skills part counts a skill as earned at its latest rating", () => {
  const ids = pre.levelKey && [...catalog.levels.get(pre.levelKey).skillIds];
  const sessions = [session("2026-10-01", { stars: { [ids[0]]: 5, [ids[1]]: 3 } }), session("2026-10-08", { stars: { [ids[0]]: 2, [ids[1]]: EARNED_AT } })];
  const r = skillsReadiness(catalog, pre.levelKey, skillStats(sessions));
  assert.equal(r.total, ids.length);
  assert.deepEqual(r.rows.map((x) => x.earned), [false, true, false, false], "a bad day later takes it back here, because a test asks for it now");
  assert.deepEqual([r.earned, r.pct], [1, 25]);
  assert.deepEqual(r.rows[0].recent, [5, 2]);
  assert.deepEqual([r.rows[0].best, r.rows[0].latest, r.rows[2].tried], [5, 2, false]);
  const empty = skillsReadiness(catalog, pre.levelKey, skillStats([]));
  assert.deepEqual([empty.earned, empty.pct], [0, 0]);
});

test("the last five ratings are kept in order", () => {
  const id = catalog.levels.get(pre.levelKey).skillIds[0];
  const sessions = [1, 2, 3, 4, 5, 3, 4].map((n, i) => session(`2026-10-${String(i + 1).padStart(2, "0")}`, { stars: { [id]: n } }));
  assert.deepEqual(skillsReadiness(catalog, pre.levelKey, skillStats(sessions)).rows[0].recent, [3, 4, 5, 3, 4]);
});

test("skills to work on: the ones you have tried, lowest first, then the ones you have not", () => {
  const ids = [...catalog.levels.get(pre.levelKey).skillIds];
  const sessions = [session("2026-10-01", { stars: { [ids[0]]: 3, [ids[1]]: 1, [ids[2]]: 4 } })];
  const r = skillsReadiness(catalog, pre.levelKey, skillStats(sessions));
  assert.deepEqual(skillsToWorkOn(r), [ids[1], ids[0], ids[3]]);
});

test("the free skate checklist is grouped and counts what you have ticked", () => {
  const t = pre.free;
  const first = t.items[0].id;
  const r = freeReadiness(t, { [first]: true, "someone-elses": true });
  assert.deepEqual(r.groups.map((g) => g.group), ["Jumps", "Spins", "Sequences"]);
  assert.equal(r.total, t.items.length);
  assert.equal(r.done, 1);
  assert.equal(r.pct, Math.round(100 / t.items.length));
  assert.equal(r.groups[0].items[0].done, true);
  assert.deepEqual(freeReadiness(null, {}), { groups: [], done: 0, total: 0, pct: 0 });
});

test("the countdown says how many days are left", () => {
  assert.deepEqual(countdown("2026-10-29", "2026-10-17"), { days: 12, label: "D-12" });
  assert.equal(countdown("2026-10-18", "2026-10-17").label, "Tomorrow");
  assert.equal(countdown("2026-10-17", "2026-10-17").label, "Today");
  assert.deepEqual(countdown("2026-10-10", "2026-10-17"), { days: -7, label: "Passed" });
  assert.equal(countdown("", "2026-10-17"), null);
  assert.equal(countdown("2026-02-31", "2026-10-17"), null);
});

test("readiness has plain words", () => {
  assert.deepEqual([0, 39, 40, 74, 75, 99, 100].map(readinessLabel), ["Just starting", "Just starting", "Getting there", "Getting there", "Almost there", "Almost there", "Ready"]);
});

test("your test and your ticks are cleaned, saved, and old backups without them load", () => {
  assert.deepEqual(sanitizeTestGoal({ id: " pre-preliminary ", date: "2026-12-05" }), { id: "pre-preliminary", date: "2026-12-05" });
  assert.deepEqual(sanitizeTestGoal({ id: "bronze", date: "2026-02-31" }), { id: "bronze", date: "" });
  for (const bad of [null, undefined, {}, { id: "" }, { id: 5 }, "bronze"]) assert.equal(sanitizeTestGoal(bad), null);
  assert.deepEqual(sanitizeChecks({ a: true, b: false, c: "yes", [" ".repeat(0)]: true, ["x".repeat(81)]: true }), { a: true });
  assert.deepEqual(sanitizeChecks([true]), {});
  assert.equal(Object.keys(sanitizeChecks(Object.fromEntries(Array.from({ length: 500 }, (_, i) => ["k" + i, true])))).length, 300);
  const state = defaultState();
  state.profile.test = { id: "preliminary", date: "2026-12-05" };
  state.testChecks = { "preliminary.j1": true };
  const back = parseBackup(exportJSON(state)).state;
  assert.deepEqual([back.profile.test, back.testChecks], [{ id: "preliminary", date: "2026-12-05" }, { "preliminary.j1": true }]);
  const old = JSON.parse(exportJSON(state));
  delete old.profile.test;
  delete old.testChecks;
  const parsed = parseBackup(JSON.stringify(old)).state;
  assert.deepEqual([parsed.profile.test, parsed.testChecks], [null, {}]);
  assert.deepEqual(sanitizeState({}).testChecks, {});
});

test("merging keeps every tick, and keeps your own chosen test", () => {
  const mine = defaultState();
  mine.profile.test = { id: "bronze", date: "" };
  mine.testChecks = { a: true };
  const theirs = defaultState();
  theirs.profile.test = { id: "silver", date: "" };
  theirs.testChecks = { b: true };
  const { state } = mergeStates(mine, theirs);
  assert.deepEqual(state.testChecks, { a: true, b: true });
  assert.equal(state.profile.test.id, "bronze");
  assert.deepEqual(replaceState({ ...theirs, profile: { ...theirs.profile, onboarded: true } }, mine).testChecks, { b: true });
});
