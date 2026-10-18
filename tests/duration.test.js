import test from "node:test";
import assert from "node:assert/strict";
import { durationParts, fmtDuration, fmtDurationShort } from "../js/util.js";
import { defaultState } from "../js/store.js";
import { lifetimeSeconds } from "../js/blades.js";
import { session } from "./helpers.js";

const hms = (h, m, s) => h * 3600 + m * 60 + s;

test("a time is hours, minutes, and seconds, with the seconds only when there are some", () => {
  assert.equal(fmtDuration(hms(10, 14, 13)), "10 hrs 14 mins 13 secs");
  assert.equal(fmtDuration(hms(10, 14, 0)), "10 hrs 14 mins");
  assert.equal(fmtDuration(hms(10, 0, 0)), "10 hrs");
  assert.equal(fmtDuration(hms(142, 5, 0)), "142 hrs 5 mins");
});

test("what is zero at the front is left out, and a zero in the middle stays", () => {
  assert.equal(fmtDuration(hms(0, 14, 13)), "14 mins 13 secs");
  assert.equal(fmtDuration(hms(0, 14, 0)), "14 mins");
  assert.equal(fmtDuration(hms(0, 0, 13)), "13 secs");
  assert.equal(fmtDuration(hms(3, 0, 20)), "3 hrs 0 mins 20 secs", "minutes stay between the hours and the seconds");
  assert.equal(fmtDuration(hms(0, 0, 0)), "0 mins");
});

test("one is singular", () => {
  assert.equal(fmtDuration(hms(1, 1, 1)), "1 hr 1 min 1 sec");
  assert.equal(fmtDuration(hms(1, 2, 0)), "1 hr 2 mins");
  assert.equal(fmtDuration(1), "1 sec");
});

test("odd input gives something sensible, and a fraction of a second is rounded", () => {
  assert.equal(fmtDuration(-5), "0 mins");
  assert.equal(fmtDuration(NaN), "0 mins");
  assert.equal(fmtDuration(undefined), "0 mins");
  assert.equal(fmtDuration(59.6), "1 min");
  assert.equal(fmtDuration(hms(0, 14, 13) + 0.4), "14 mins 13 secs");
});

test("the short form is what a flap board spells out, one letter to a tile", () => {
  assert.equal(fmtDurationShort(hms(10, 14, 13)), "10 H 14 M 13 S");
  assert.equal(fmtDurationShort(hms(20000, 59, 59)).length <= 18, true, "the longest total still fits on the board");
  assert.equal(fmtDurationShort(0), "0 M");
  assert.deepEqual(durationParts(hms(2, 0, 5)).map((p) => p.n), [2, 0, 5]);
});

test("the all-time total in seconds is the starting hours plus every second on the ice", () => {
  const state = defaultState(new Date("2026-10-01T00:00:00Z"));
  state.blades.lifetimeBase = 10;
  state.sessions.push(session("2026-10-05", { onIceSec: 14 * 60 + 13 }), session("2026-10-06", { onIceSec: 61 }));
  assert.equal(lifetimeSeconds(state), 36000 + 14 * 60 + 13 + 61);
  assert.equal(fmtDuration(lifetimeSeconds(state)), "10 hrs 15 mins 14 secs");
  state.blades.lifetimeBase = 0;
  state.sessions = [session("2026-10-05", { onIceSec: 10 * 3600 + 14 * 60 + 13 })];
  assert.equal(fmtDuration(lifetimeSeconds(state)), "10 hrs 14 mins 13 secs", "the example from the skater");
});
