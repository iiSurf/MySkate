import test from "node:test";
import assert from "node:assert/strict";
import { defaultState, sanitizeState, parseBackup, exportJSON, mergeStates } from "../js/store.js";
import { bladeHours, lifetimeHours, setBladeHours, setLifetimeHours, logSharpening } from "../js/blades.js";
import { session } from "./helpers.js";

const fresh = () => defaultState(new Date("2026-10-01T00:00:00Z"));

test("the all-time total is the hours from before MySkate plus every session saved, before and after setup", () => {
  const state = fresh();
  state.blades.lifetimeBase = 100;
  state.sessions.push(session("2026-09-20", { onIceSec: 7200 }));
  assert.equal(lifetimeHours(state), 102, "a session from before the blade count began still counts toward all time");
  assert.equal(bladeHours(state), 0, "but not toward the hours since sharpening");
  state.sessions.push(session("2026-10-05", { onIceSec: 5400 }));
  assert.equal(lifetimeHours(state), 103.5);
  assert.equal(bladeHours(state), 1.5);
});

test("sharpening starts the blade count again and leaves the all-time total alone", () => {
  const state = fresh();
  state.blades.baseHours = 10;
  state.blades.lifetimeBase = 40;
  state.sessions.push(session("2026-10-05", { onIceSec: 3600 }));
  assert.equal(lifetimeHours(state), 41);
  logSharpening(state, new Date("2026-10-10T00:00:00Z"));
  assert.equal(bladeHours(state), 0);
  assert.equal(lifetimeHours(state), 41, "the 11 hours on the blades are still on the skates");
  state.sessions.push(session("2026-10-12", { onIceSec: 1800 }));
  assert.equal(lifetimeHours(state), 41.5);
  assert.equal(bladeHours(state), 0.5);
});

test("correcting the hours on the blades by hand moves the all-time total by the same amount", () => {
  const state = fresh();
  state.blades.baseHours = 5;
  state.blades.lifetimeBase = 20;
  state.sessions.push(session("2026-10-05", { onIceSec: 3600 }));
  assert.equal(bladeHours(state), 6);
  setBladeHours(state, 9);
  assert.equal(bladeHours(state), 9);
  assert.equal(lifetimeHours(state), 24, "three more hours on the blades are three more on the skates");
  setBladeHours(state, 4);
  assert.equal(bladeHours(state), 4);
  assert.equal(lifetimeHours(state), 19, "and five fewer take five off");
  setBladeHours(state, 0);
  assert.equal(bladeHours(state), 1, "the session since setup still counts");
  assert.ok(lifetimeHours(state) >= bladeHours(state));
});

test("setting the all-time total keeps the sessions, stores the rest, and is never less than the hours on the blades", () => {
  const state = fresh();
  state.blades.baseHours = 6;
  state.blades.lifetimeBase = 6;
  state.sessions.push(session("2026-10-05", { onIceSec: 7200 }));
  setLifetimeHours(state, 150);
  assert.equal(lifetimeHours(state), 150);
  assert.equal(state.blades.lifetimeBase, 148, "150 in all, 2 of them from the saved session");
  setLifetimeHours(state, 3);
  assert.equal(lifetimeHours(state), bladeHours(state), "cannot be fewer than the 8 hours on the blades");
  setLifetimeHours(state, 999999);
  assert.ok(state.blades.lifetimeBase <= 20000);
  setLifetimeHours(state, 500);
  state.sessions.push(session("2026-10-09", { onIceSec: 3600 }));
  assert.equal(lifetimeHours(state), 501, "new sessions add to what was entered");
});

test("older data without an all-time total starts it at the hours already on the blades, and it is never less than those", () => {
  assert.equal(sanitizeState({ blades: { baseHours: 12 } }).blades.lifetimeBase, 12);
  assert.equal(sanitizeState({}).blades.lifetimeBase, 0);
  assert.equal(sanitizeState({ blades: { baseHours: 12, lifetimeBase: 80 } }).blades.lifetimeBase, 80);
  assert.equal(sanitizeState({ blades: { baseHours: 12, lifetimeBase: 5 } }).blades.lifetimeBase, 12);
  assert.equal(sanitizeState({ blades: { lifetimeBase: "lots" } }).blades.lifetimeBase, 0);
  assert.equal(sanitizeState({ blades: { lifetimeBase: -50 } }).blades.lifetimeBase, 0);
  assert.equal(sanitizeState({ blades: { lifetimeBase: 1e9 } }).blades.lifetimeBase, 20000);
  assert.equal(defaultState().blades.lifetimeBase, 0);
});

test("the all-time total survives a backup, and a merge keeps this device's answer", () => {
  const a = fresh();
  a.profile.onboarded = true;
  a.blades.lifetimeBase = 321;
  a.sessions.push(session("2026-10-05", { onIceSec: 3600 }));
  const back = parseBackup(exportJSON(a)).state;
  assert.equal(back.blades.lifetimeBase, 321);
  assert.equal(lifetimeHours(back), 322);
  const mine = fresh();
  mine.profile.onboarded = true;
  mine.blades.lifetimeBase = 50;
  assert.equal(mergeStates(mine, back).state.blades.lifetimeBase, 50, "what is already here wins");
  const empty = fresh();
  assert.equal(mergeStates(empty, back).state.blades.lifetimeBase, 321, "a fresh app takes the backup's setup");
});
