import test from "node:test";
import assert from "node:assert/strict";
import { EIGHT_R, eightPoint, weekSessions, weekEight, streakEights, weekStubs } from "../js/week.js";
import { session } from "./helpers.js";

const R = EIGHT_R;
const near = (a, b) => Math.abs(a - b) < 0.11;

test("the blade starts in the middle, circles the left loop first, then the right", () => {
  const at = (f) => eightPoint(f);
  assert.deepEqual(at(0), { x: 0, y: 0 });
  assert.ok(near(at(0.125).x, -R) && near(at(0.125).y, -R), "a quarter of the way round the left loop is its top");
  assert.ok(near(at(0.25).x, -2 * R) && near(at(0.25).y, 0), "halfway round the left loop is its far left");
  assert.ok(near(at(0.5).x, 0) && near(at(0.5).y, 0), "the first loop is whole back at the middle");
  assert.ok(near(at(0.625).x, R) && near(at(0.625).y, -R), "then the top of the right loop");
  assert.ok(near(at(0.75).x, 2 * R) && near(at(0.75).y, 0), "then the far right");
  assert.ok(near(at(1).x, 0) && near(at(1).y, 0), "both loops whole is the middle again");
});

test("the blade stays on the picture whatever it is told", () => {
  assert.deepEqual(eightPoint(-3), eightPoint(0));
  assert.deepEqual(eightPoint(9), eightPoint(1));
  assert.deepEqual(eightPoint(NaN), eightPoint(0));
  for (let f = 0; f <= 1; f += 0.01) {
    const p = eightPoint(f);
    assert.ok(Math.abs(p.x) <= 2 * R + 0.1 && Math.abs(p.y) <= R + 0.1, String(f));
  }
});

test("the week is Monday to Sunday, and its sessions come oldest first", () => {
  const sunday = session("2026-10-11");
  const mon = session("2026-10-12");
  const thu = session("2026-10-15");
  const sun = session("2026-10-18");
  const next = session("2026-10-19");
  const got = weekSessions([next, thu, sunday, sun, mon], "2026-10-17");
  assert.deepEqual(got.map((s) => s.date), ["2026-10-12", "2026-10-15", "2026-10-18"]);
});

test("each session traces its share of the eight, and the week is whole at the streak number", () => {
  const none = weekEight([], "2026-10-17", 2);
  assert.equal(none.fraction, 0);
  assert.equal(none.complete, false);
  assert.deepEqual(none.loops, [null, null]);
  const one = weekEight([session("2026-10-13", { onIceSec: 5400 })], "2026-10-17", 2);
  assert.equal(one.fraction, 0.5);
  assert.equal(one.complete, false);
  assert.equal(one.hours, 1.5);
  assert.equal(one.loops[0].date, "2026-10-13");
  assert.equal(one.loops[1], null);
  const three = weekEight([session("2026-10-12"), session("2026-10-14"), session("2026-10-16")], "2026-10-17", 2);
  assert.equal(three.fraction, 1, "extra sessions do not draw past the end");
  assert.equal(three.complete, true);
  assert.equal(three.count, 3);
  assert.equal(three.loops[1].date, "2026-10-14", "the second loop is the session that closed the eight");
});

test("a bad streak number still gives a sensible picture", () => {
  assert.equal(weekEight([session("2026-10-13")], "2026-10-17", 0).needed, 1);
  assert.equal(weekEight([session("2026-10-13")], "2026-10-17", 0).complete, true);
  assert.equal(weekEight([], "2026-10-17", undefined).needed, 1);
});

test("the row of eights is one gold eight per week in a row, with a ghost for the week still to finish", () => {
  assert.deepEqual(streakEights(0, false), ["ghost"]);
  assert.deepEqual(streakEights(2, false), ["done", "done", "ghost"]);
  assert.deepEqual(streakEights(2, true), ["done", "done"]);
  assert.equal(streakEights(30, true).length, 8);
  assert.equal(streakEights(30, false).length, 9);
});

test("the week's stubs run Monday to Sunday, with the days you skated and today marked", () => {
  const stubs = weekStubs([session("2026-10-13"), session("2026-10-15"), session("2026-10-05")], "2026-10-17");
  assert.equal(stubs.map((x) => x.letter).join(""), "MTWTFSS");
  assert.deepEqual(stubs.map((x) => x.day), [12, 13, 14, 15, 16, 17, 18]);
  assert.deepEqual(stubs.map((x) => x.done), [false, true, false, true, false, false, false], "a session from last week does not count");
  assert.deepEqual(stubs.map((x) => x.today), [false, false, false, false, false, true, false]);
  assert.equal(weekStubs([], "2026-10-12")[0].today, true, "a Monday is the first stub");
  assert.equal(weekStubs([], "2026-10-18")[6].today, true, "a Sunday is the last stub");
  assert.equal(weekStubs([], "2026-12-31").map((x) => x.day).join(","), "28,29,30,31,1,2,3", "a week can cross the end of a month");
});
