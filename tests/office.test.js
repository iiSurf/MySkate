import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeOffIce, sanitizeOffIceList, addOffIce, recentOffIce, offIceSummary, offIceByDay, offIceMilestones, offKindName, MAX_OFFICE } from "../js/office.js";
import { evaluateBadges, progressText } from "../js/badges.js";
import { monthGrid } from "../js/calendar.js";
import { defaultState, sanitizeState, parseBackup, exportJSON, mergeStates, replaceState } from "../js/store.js";
import { realCatalog, session } from "./helpers.js";

const e = (o = {}) => sanitizeOffIce({ id: "o1", date: "2026-10-15", kind: "strength", minutes: 30, note: "", ...o });

test("an off-ice workout is cleaned: it needs an id, a real day, and 5 to 300 minutes", () => {
  assert.deepEqual(e(), { id: "o1", date: "2026-10-15", kind: "strength", minutes: 30, note: "" });
  assert.equal(e({ id: "" }), null);
  assert.equal(e({ date: "2026-02-31" }), null);
  assert.equal(e({ date: "yesterday" }), null);
  assert.equal(e({ minutes: 4 }), null);
  assert.equal(e({ minutes: 301 }), null);
  assert.equal(e({ minutes: "30" }), null, "a number, not text, in saved data");
  assert.equal(e({ minutes: NaN }), null);
  assert.equal(e({ minutes: 29.6 }).minutes, 30);
  assert.equal(e({ kind: "yoga" }).kind, "other");
  assert.equal(e({ note: "  felt good\u0007  " }).note, "felt good", "trimmed, control characters removed");
  assert.equal(e({ note: "n".repeat(900) }).note.length, 200);
  assert.equal(sanitizeOffIce(null), null);
  assert.equal(offKindName("dance"), "Dance or ballet");
  assert.equal(offKindName("nope"), "Other");
});

test("a list has no repeated ids and a limit", () => {
  const many = Array.from({ length: MAX_OFFICE + 50 }, (_, i) => ({ id: "o" + i, date: "2026-10-15", minutes: 20 }));
  assert.equal(sanitizeOffIceList(many).length, MAX_OFFICE);
  assert.deepEqual(sanitizeOffIceList([{ id: "a", date: "2026-10-15", minutes: 20 }, { id: "a", date: "2026-10-16", minutes: 20 }, null]).map((x) => x.date), ["2026-10-15"]);
});

test("adding a workout: today and the past are fine, the future is not, and bad input is refused", () => {
  const ok = addOffIce([], { date: "2026-10-17", kind: "stretch", minutes: "25", note: "hips" }, "a", "2026-10-17");
  assert.deepEqual([ok.status, ok.list[0].minutes, ok.list[0].kind], ["added", 25, "stretch"], "text from a form field is read as a number");
  assert.equal(addOffIce([], { date: "2026-10-18", kind: "stretch", minutes: 20 }, "b", "2026-10-17").status, "future");
  assert.equal(addOffIce([], { date: "2026-10-10", kind: "stretch", minutes: 2 }, "b", "2026-10-17").status, "invalid");
  assert.equal(addOffIce([], { date: "", kind: "stretch", minutes: 20 }, "b", "2026-10-17").status, "invalid");
  assert.equal(addOffIce([], { date: "2026-10-10", kind: "stretch", minutes: "lots" }, "b", "2026-10-17").status, "invalid");
  const full = Array.from({ length: MAX_OFFICE }, (_, i) => e({ id: "o" + i }));
  assert.equal(addOffIce(full, { date: "2026-10-10", kind: "stretch", minutes: 20 }, "n", "2026-10-17").status, "full");
});

test("the list is newest first, and this week's totals run Monday to Sunday", () => {
  const list = [e({ id: "a", date: "2026-10-12", minutes: 30 }), e({ id: "b", date: "2026-10-16", minutes: 45, kind: "dance" }), e({ id: "c", date: "2026-10-11", minutes: 60 }), e({ id: "d", date: "2026-10-18", minutes: 15, kind: "cardio" })];
  assert.deepEqual(recentOffIce(list).map((x) => x.id), ["d", "b", "a", "c"]);
  const sum = offIceSummary(list, "2026-10-17");
  assert.deepEqual([sum.weekCount, sum.weekMin, sum.allCount, sum.allMin, sum.kinds], [3, 90, 4, 150, 3], "Sunday the 11th is last week; Sunday the 18th is this week");
  assert.deepEqual(offIceSummary([], "2026-10-17"), { weekCount: 0, weekMin: 0, allCount: 0, allMin: 0, kinds: 0 });
  assert.deepEqual(Object.keys(offIceByDay(list)).sort(), ["2026-10-11", "2026-10-12", "2026-10-16", "2026-10-18"]);
});

test("milestones: the first workout, the tenth, and the day a third kind was logged", () => {
  const days = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
  const kinds = ["stretch", "stretch", "strength", "stretch", "dance", "stretch", "stretch", "stretch", "stretch", "stretch", "stretch", "stretch"];
  const list = days.map((date, i) => e({ id: "o" + i, date, kind: kinds[i] }));
  assert.deepEqual(offIceMilestones(list), { first: "2026-10-01", tenth: "2026-10-10", threeKinds: "2026-10-05", count: 12, kinds: 3 });
  assert.deepEqual(offIceMilestones([]), { first: null, tenth: null, threeKinds: null, count: 0, kinds: 0 });
  assert.equal(offIceMilestones([e({ id: "x" }), e({ id: "y", kind: "dance" })]).threeKinds, null);
});

const catalog = realCatalog();
const got = (sessions, extra = {}) => evaluateBadges({ sessions, sharpenings: [], backupAt: null, catalog, ...extra });
const one = (list, id) => list.find((b) => b.id === id);

test("off-ice badges are earned on the right days, with no sessions needed", () => {
  const list = Array.from({ length: 10 }, (_, i) => e({ id: "o" + i, date: `2026-10-0${i % 9 + 1}`, kind: i === 2 ? "dance" : i === 4 ? "jumps" : "strength" }));
  const badges = got([], { offIce: list });
  assert.deepEqual([one(badges, "off-1").earned, one(badges, "off-1").earnedOn], [true, "2026-10-01"]);
  assert.equal(one(badges, "off-10").earned, true);
  assert.equal(one(badges, "off-kinds").earned, true);
  const two = got([session("2026-10-01")], { offIce: [e({ id: "a" }), e({ id: "b", date: "2026-10-16" })] });
  assert.deepEqual([one(two, "off-1").earned, one(two, "off-10").earned, progressText(one(two, "off-10")), one(two, "off-1").sessionsTaken], [true, false, "2 of 10", 1]);
  assert.equal(one(got([]), "off-1").earned, false);
});

test("the calendar marks days with off-ice work", () => {
  const g = monthGrid("2026-10", { sessions: [], offIce: [e({ id: "a", date: "2026-10-15" }), e({ id: "b", date: "2026-10-15", kind: "dance" }), e({ id: "c", date: "2026-10-16" })] }, "2026-10-17");
  const cells = g.weeks.flatMap((w) => w.days).filter(Boolean);
  assert.deepEqual([cells.find((c) => c.day === 15).off, cells.find((c) => c.day === 16).off, cells.find((c) => c.day === 17).off], [2, 1, 0]);
});

test("off-ice work is saved with your data, cleaned, merged by id, and old backups load", () => {
  const state = defaultState();
  state.offIce = [e({ id: "a" }), e({ id: "b", kind: "dance", note: "ballet class" })];
  assert.deepEqual(parseBackup(exportJSON(state)).state.offIce, state.offIce);
  assert.deepEqual(sanitizeState({ offIce: [{ id: "a", date: "2026-10-15", minutes: 20 }, { id: "b", date: "x", minutes: 20 }, "junk"] }).offIce.map((x) => x.id), ["a"]);
  const old = JSON.parse(exportJSON(state));
  delete old.offIce;
  assert.deepEqual(parseBackup(JSON.stringify(old)).state.offIce, []);
  const mine = defaultState();
  mine.offIce = [e({ id: "a", minutes: 30 })];
  const theirs = defaultState();
  theirs.offIce = [e({ id: "a", minutes: 99 }), e({ id: "b" })];
  assert.deepEqual(mergeStates(mine, theirs).state.offIce.map((x) => [x.id, x.minutes]), [["a", 30], ["b", 30]]);
  assert.deepEqual(replaceState({ ...theirs, profile: { ...theirs.profile, onboarded: true } }, mine).offIce.map((x) => x.id), ["a", "b"]);
});
