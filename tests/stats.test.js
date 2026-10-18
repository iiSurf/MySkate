import test from "node:test";
import assert from "node:assert/strict";
import { nextLevelKey, levelSkillIds, levelLabel } from "../js/catalog.js";
import { skillStats, levelProgress, suggestNext, totals, landedPct, activeAsSession } from "../js/stats.js";
import { bladeHours, bladeInfo, logSharpening } from "../js/blades.js";
import { newActive, elapsedMs, pauseActive, resumeActive, setEntry, addSkill, finishActive } from "../js/timer.js";
import { defaultState } from "../js/store.js";
import { realCatalog, session } from "./helpers.js";

const catalog = realCatalog();
const PFS = "lts-freeskate/pre-free-skate";

test("the catalog loads every skill with a unique id", () => {
  assert.equal(catalog.skills.size, 233);
  assert.equal(catalog.levels.size, 6 + 7 + 6 + 12 + 6);
});

test("levels lead on to the next level", () => {
  assert.equal(nextLevelKey(catalog, "lts-basic/basic-6"), PFS);
  assert.equal(nextLevelKey(catalog, "lts-adult/adult-6"), PFS);
  assert.equal(nextLevelKey(catalog, PFS), "lts-freeskate/free-skate-1");
  assert.equal(nextLevelKey(catalog, "lts-freeskate/free-skate-6"), null);
  assert.equal(nextLevelKey(catalog, "usfs-skating-skills/gold"), null, "standard tests end at Gold");
  assert.equal(nextLevelKey(catalog, "usfs-skating-skills/adult-bronze"), "usfs-skating-skills/adult-silver");
});

test("required skills leave out bonus items", () => {
  assert.equal(levelSkillIds(catalog, PFS).length, 7);
  assert.equal(levelSkillIds(catalog, PFS, { bonus: true }).length, 8);
  assert.equal(levelLabel(catalog, "usfs-skating-skills/pre-bronze"), "Pre-Bronze");
});

test("skillStats follows each skill's ratings and landings", () => {
  const j = "pre-free-skate.waltz-jump";
  const a = session("2026-10-05", { stars: { [j]: 2 }, onIceSec: 0 });
  a.entries[0].attempts = 10;
  a.entries[0].landed = 4;
  const b = session("2026-10-12", { stars: { [j]: 4 }, onIceSec: 0 });
  b.entries[0].attempts = 10;
  b.entries[0].landed = 8;
  const st = skillStats([b, a]).get(j);
  assert.equal(st.count, 2);
  assert.equal(st.latest, 4);
  assert.equal(st.best, 4);
  assert.equal(st.firstDate, "2026-10-05");
  assert.equal(st.lastDate, "2026-10-12");
  assert.equal(landedPct(st), 60);
  assert.deepEqual(st.history.map((h) => h.stars), [2, 4]);
});

test("level progress counts skills at 4 stars or more", () => {
  const ids = levelSkillIds(catalog, PFS);
  const stars = { [ids[0]]: 4, [ids[1]]: 5, [ids[2]]: 3 };
  const p = levelProgress(catalog, PFS, skillStats([session("2026-10-05", { stars })]));
  assert.deepEqual({ total: p.total, earned: p.earned, pct: p.pct }, { total: 7, earned: 2, pct: 29 });
});

test("suggestions alternate skating skills with jumps and spins, new skills first", () => {
  const state = defaultState();
  const out = suggestNext(state, catalog, new Map(), "2026-10-15", 6);
  assert.equal(out.length, 6);
  assert.ok(out.every((s) => s.reason === "New"));
  const cats = out.map((s) => catalog.skills.get(s.skillId).cat);
  assert.equal(cats[0], "skills");
  assert.ok(cats[1] === "jumps" || cats[1] === "spins");
  assert.equal(new Set(out.map((s) => s.skillId)).size, 6);
});

test("suggestions put weak skills before fresh ones and bring back stale skills", () => {
  const state = defaultState();
  const ids = levelSkillIds(catalog, PFS).filter((id) => catalog.skills.get(id).cat === "skills");
  const stars = { [ids[0]]: 2, [ids[1]]: 5 };
  const old = session("2026-09-01", { stars: { [ids[1]]: 5 }, onIceSec: 0 });
  const recent = session("2026-10-14", { stars: { [ids[0]]: 2 }, onIceSec: 0 });
  const stats = skillStats([old, recent]);
  const out = suggestNext(state, catalog, stats, "2026-10-15", 12);
  const reason = (id) => out.find((s) => s.skillId === id)?.reason;
  assert.equal(reason(ids[0]), "Needs work");
  assert.equal(reason(ids[1]), "Keep it fresh");
  const needsIndex = out.findIndex((s) => s.skillId === ids[0]);
  const freshIndex = out.findIndex((s) => s.skillId === ids[1]);
  assert.ok(needsIndex < freshIndex || freshIndex === -1);
  assert.ok(stars);
});

test("once a level is mostly earned, suggestions reach for the next level", () => {
  const state = defaultState();
  const ids = levelSkillIds(catalog, PFS);
  const stars = Object.fromEntries(ids.map((id) => [id, 5]));
  const stats = skillStats([session("2026-10-14", { stars, onIceSec: 0 })]);
  const out = suggestNext(state, catalog, stats, "2026-10-15", 6);
  assert.ok(out.length > 0);
  assert.ok(out.every((s) => s.reason === "Next level"));
  assert.ok(out.every((s) => catalog.skills.get(s.skillId).levelKey === "lts-freeskate/free-skate-1"));
});

test("a jump library level suggests jumps and spins", () => {
  const state = defaultState();
  state.profile.levels.jumps = "library";
  const out = suggestNext(state, catalog, new Map(), "2026-10-15", 8);
  const lib = out.filter((s) => s.skillId.startsWith("lib."));
  assert.ok(lib.length >= 3);
});

test("totals add up ice time for the week, month, and all time", () => {
  const s = [
    session("2026-10-05", { onIceSec: 3600 }),
    session("2026-10-14", { onIceSec: 1800 }),
    session("2026-09-20", { onIceSec: 3600 }),
  ];
  const t = totals(s, "2026-10-15");
  assert.equal(t.sessions, 3);
  assert.equal(t.allMin, 150);
  assert.equal(t.monthMin, 90);
  assert.equal(t.weekMin, 30);
});

test("blade life counts hours since setup, and a sharpening starts the count again", () => {
  const state = defaultState(new Date("2026-10-01T00:00:00Z"));
  state.blades.baseHours = 10;
  state.blades.limitHours = 25;
  state.sessions.push(session("2026-09-20", { onIceSec: 7200 }));
  assert.equal(bladeHours(state), 10, "sessions before setup do not count");
  state.sessions.push(session("2026-10-05", { onIceSec: 7200 }), session("2026-10-08", { onIceSec: 3600 }));
  assert.equal(bladeHours(state), 13);
  let info = bladeInfo(state);
  assert.equal(info.tone, "sharp");
  assert.equal(info.pct, 52);
  state.blades.limitHours = 20;
  info = bladeInfo(state);
  assert.equal(info.tone, "dull");
  state.blades.limitHours = 14;
  assert.equal(bladeInfo(state).tone, "due");
  logSharpening(state, new Date("2026-10-10T00:00:00Z"));
  assert.equal(state.sharpenings.length, 1);
  assert.equal(state.sharpenings[0].hours, 13);
  assert.equal(bladeHours(state), 0);
  state.sessions.push(session("2026-10-12", { onIceSec: 1800 }));
  assert.equal(bladeHours(state), 0.5);
});

test("the on-ice clock survives pausing, resuming, and a reload", () => {
  let a = newActive({ order: ["x", "y"], bookedMin: 45, now: 1000 });
  assert.equal(elapsedMs(a, 61000), 60000);
  a = pauseActive(a, 61000);
  assert.equal(elapsedMs(a, 500000), 60000, "paused time does not count");
  a = resumeActive(a, 100000);
  assert.equal(elapsedMs(a, 130000), 90000);
  const reloaded = JSON.parse(JSON.stringify(a));
  assert.equal(elapsedMs(reloaded, 130000), 90000);
  assert.equal(pauseActive(pauseActive(a, 130000), 140000).accumMs, 90000, "pausing twice is harmless");
});

test("a finished session keeps rated or attempted skills and clamps landings", () => {
  let a = newActive({ order: ["x", "y", "z"], bookedMin: 45, now: Date.parse("2026-10-15T10:00:00") });
  a = setEntry(a, "x", { stars: 3 });
  a = setEntry(a, "y", { attempts: 4, landed: 9 });
  a = addSkill(a, "w");
  a = addSkill(a, "w");
  assert.deepEqual(a.order, ["x", "y", "z", "w"]);
  assert.equal(a.entries.y.landed, 4);
  const done = finishActive(a, Date.parse("2026-10-15T10:30:00"), "good day");
  assert.equal(done.onIceSec, 1800);
  assert.equal(done.bookedMin, 45);
  assert.equal(done.date, "2026-10-15");
  assert.deepEqual(done.entries.map((e) => e.skillId), ["x", "y"]);
  assert.equal(done.note, "good day");
  const pretend = activeAsSession(a, "2026-10-15");
  assert.equal(pretend.entries.length, 2);
});

import { recordTry, undoTry, entryOf } from "../js/timer.js";
import { splitMinutes, move } from "../js/plan.js";

test("tries at a jump can be recorded and undone one at a time", () => {
  let a = newActive({ order: ["j"], bookedMin: 30, now: 1000 });
  a = recordTry(a, "j", true);
  a = recordTry(a, "j", false);
  a = recordTry(a, "j", true);
  assert.deepEqual({ landed: entryOf(a, "j").landed, attempts: entryOf(a, "j").attempts, seq: entryOf(a, "j").seq }, { landed: 2, attempts: 3, seq: "LML" });
  a = undoTry(a, "j");
  assert.deepEqual({ landed: entryOf(a, "j").landed, attempts: entryOf(a, "j").attempts, seq: entryOf(a, "j").seq }, { landed: 1, attempts: 2, seq: "LM" });
  a = undoTry(a, "j");
  a = undoTry(a, "j");
  a = undoTry(a, "j");
  assert.equal(entryOf(a, "j").attempts, 0);
  assert.equal(entryOf(a, "j").landed, 0);
  const done = finishActive(recordTry(a, "j", true), 5000);
  assert.equal("seq" in done.entries[0], false, "the try order is not kept in a saved session");
});

test("splitMinutes shares a slot in steps of five", () => {
  assert.deepEqual(splitMinutes(60, 4), [15, 15, 15, 15]);
  assert.deepEqual(splitMinutes(60, 5), [15, 15, 10, 10, 10]);
  assert.deepEqual(splitMinutes(45, 2), [25, 20]);
  assert.deepEqual(splitMinutes(30, 8).reduce((a, b) => a + b, 0), 40, "never less than five minutes each");
  assert.deepEqual(splitMinutes(60, 0), []);
  assert.equal(splitMinutes(120, 7).reduce((a, b) => a + b, 0), 120);
});

test("move shifts an item and stops at the ends", () => {
  assert.deepEqual(move(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(move(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
  assert.deepEqual(move(["a", "b", "c"], 2, 1), ["a", "b", "c"]);
});
