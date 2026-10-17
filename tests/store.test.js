import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultState,
  sanitizeState,
  loadState,
  saveState,
  exportJSON,
  exportCSV,
  parseBackup,
  mergeStates,
  replaceState,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from "../js/store.js";
import { realCatalog, session, fakeStorage } from "./helpers.js";

test("a new state has sane defaults", () => {
  const s = defaultState(new Date("2026-10-16T12:00:00Z"));
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.profile.onboarded, false);
  assert.equal(s.blades.limitHours, 25);
  assert.deepEqual(s.sessions, []);
  assert.equal(s.active, null);
});

test("sanitizeState drops bad sessions, clamps numbers, trims text, and removes duplicates", () => {
  const good = session("2026-10-05", { stars: { a: 9 } });
  good.entries[0].landed = 50;
  good.entries[0].attempts = 3;
  const dirty = {
    sessions: [good, { id: "x", date: "not a date" }, null, { ...good }, { id: "", date: "2026-10-06" }],
    profile: { name: "n".repeat(500), defaultSlotMin: 99999, onboarded: "yes" },
    blades: { limitHours: -4, baseHours: "lots" },
    settings: { light: "neon", contrast: "yes" },
    cues: { a: "keep your eyes up", b: "   ", c: 12 },
  };
  const s = sanitizeState(dirty);
  assert.equal(s.sessions.length, 1);
  assert.equal(s.sessions[0].entries[0].stars, 5);
  assert.equal(s.sessions[0].entries[0].attempts, 3);
  assert.equal(s.sessions[0].entries[0].landed, 3, "landed never exceeds attempts");
  assert.equal(s.profile.name.length, 80);
  assert.equal(s.profile.defaultSlotMin, 300);
  assert.equal(s.profile.onboarded, false, "only a real true counts");
  assert.equal(s.blades.limitHours, 5);
  assert.equal(s.blades.baseHours, 0);
  assert.equal(s.settings.light, "golden");
  assert.equal(s.settings.contrast, false);
  assert.deepEqual(s.cues, { a: "keep your eyes up" });
});

test("sanitizeState keeps the session in progress only when asked", () => {
  const active = { id: "act", startedAt: 1000, bookedMin: 45, order: ["a", "b"], index: 5, entries: { a: { stars: 3, landed: 1, attempts: 2, note: "ok" } }, running: true, runStart: 1000, accumMs: 0 };
  assert.equal(sanitizeState({ active }).active, null);
  const kept = sanitizeState({ active }, { keepActive: true }).active;
  assert.equal(kept.id, "act");
  assert.equal(kept.index, 1, "index is clamped to the plan");
  assert.equal(kept.entries.a.stars, 3);
});

test("saving and loading round-trips, and storage problems are survivable", () => {
  const storage = fakeStorage();
  const state = defaultState();
  state.profile.name = "Skater";
  state.sessions.push(session("2026-10-05", { stars: { a: 3 } }));
  assert.equal(saveState(state, storage), true);
  const back = loadState(storage);
  assert.equal(back.status, "ok");
  assert.equal(back.state.profile.name, "Skater");
  assert.equal(back.state.sessions.length, 1);

  assert.equal(loadState(fakeStorage()).status, "new");

  const damaged = fakeStorage({ [STORAGE_KEY]: "{oops" });
  const recovered = loadState(damaged);
  assert.equal(recovered.status, "recovered");
  assert.equal(damaged.data[STORAGE_KEY + ".damaged"], "{oops", "the broken text is kept aside");

  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(loadState(blocked).status, "unavailable");
  assert.equal(saveState(state, blocked), false);
});

test("a state from a newer version is not loaded over", () => {
  const newer = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 99, sessions: [] }) });
  assert.equal(loadState(newer).status, "recovered");
});

test("exportJSON leaves out the session in progress and backup bookkeeping, and parseBackup reads it back", () => {
  const state = defaultState();
  state.sessions.push(session("2026-10-05", { stars: { a: 4 } }), session("2026-10-12", { stars: { a: 5 } }));
  state.active = { id: "act", startedAt: 1, bookedMin: 60, order: [], index: 0, entries: {}, running: true, runStart: 1, accumMs: 0 };
  state.backup.lastExportAt = "2026-10-12T00:00:00.000Z";
  const text = exportJSON(state, new Date("2026-10-13T00:00:00Z"));
  const raw = JSON.parse(text);
  assert.equal(raw.app, "MySkate");
  assert.equal("active" in raw, false);
  assert.equal("backup" in raw, false);
  const parsed = parseBackup(text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.summary.sessions, 2);
  assert.equal(parsed.summary.first, "2026-10-05");
  assert.equal(parsed.summary.last, "2026-10-12");
});

test("parseBackup explains what is wrong with a bad file", () => {
  assert.match(parseBackup("{not json").error, /not readable/);
  assert.match(parseBackup(JSON.stringify({ hello: 1 })).error, /does not look like/);
  assert.match(parseBackup(JSON.stringify({ schemaVersion: 1, sessions: "no" })).error, /does not look like/);
  assert.match(parseBackup(JSON.stringify({ schemaVersion: 42, sessions: [] })).error, /newer version/);
});

test("merging adds missing sessions, never duplicates, and keeps newer progress", () => {
  const current = defaultState();
  current.profile.onboarded = true;
  current.profile.name = "Me";
  const shared = session("2026-10-05", { stars: { a: 3 } });
  const newer = session("2026-10-20", { stars: { a: 5 } });
  current.sessions.push(shared, newer);
  current.cues = { a: "my cue" };

  const incoming = defaultState();
  incoming.profile.onboarded = true;
  incoming.profile.name = "Old backup";
  const older = session("2026-09-30", { stars: { a: 1 } });
  incoming.sessions.push(older, { ...shared });
  incoming.cues = { a: "old cue", b: "extra cue" };
  incoming.sharpenings = [{ date: "2026-09-01", hours: 24 }];

  const { state, addedSessions } = mergeStates(current, incoming);
  assert.equal(addedSessions, 1);
  assert.deepEqual(state.sessions.map((s) => s.date), ["2026-09-30", "2026-10-05", "2026-10-20"]);
  assert.equal(state.profile.name, "Me");
  assert.deepEqual(state.cues, { a: "my cue", b: "extra cue" });
  assert.equal(state.sharpenings.length, 1);
  // Merging twice changes nothing more.
  assert.equal(mergeStates(state, incoming).addedSessions, 0);
});

test("merging into a fresh app takes the backup's setup", () => {
  const fresh = defaultState();
  const incoming = defaultState();
  incoming.profile.onboarded = true;
  incoming.profile.name = "Restored";
  incoming.blades.limitHours = 35;
  const { state } = mergeStates(fresh, incoming);
  assert.equal(state.profile.name, "Restored");
  assert.equal(state.blades.limitHours, 35);
});

test("replacing swaps everything but marks setup done and keeps the backup reminder time", () => {
  const current = defaultState();
  current.backup.lastExportAt = "2026-10-12T00:00:00.000Z";
  current.sessions.push(session("2026-10-05"));
  const incoming = defaultState();
  incoming.sessions.push(session("2026-09-01"));
  const next = replaceState(incoming, current);
  assert.equal(next.sessions.length, 1);
  assert.equal(next.sessions[0].date, "2026-09-01");
  assert.equal(next.profile.onboarded, true);
  assert.equal(next.backup.lastExportAt, "2026-10-12T00:00:00.000Z");
});

test("CSV has one row per rating and protects against spreadsheet formulas", () => {
  const catalog = realCatalog();
  const state = defaultState();
  const s = session("2026-10-05", { onIceSec: 1800, stars: { "pre-free-skate.waltz-jump": 4 } });
  s.entries[0].note = '=HYPERLINK("http://example.com"), "quoted"';
  s.entries[0].attempts = 10;
  s.entries[0].landed = 7;
  state.sessions.push(s);
  const csv = exportCSV(state, catalog);
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^date,booked_min,on_ice_min,track,level,skill,type,skates,landed,attempts,note$/);
  assert.match(lines[1], /Waltz jump/);
  assert.match(lines[1], /,4,7,10,/);
  assert.match(lines[1], /"'=HYPERLINK\(""http:\/\/example.com""\), ""quoted"""$/);
});

test("the quick tour flag starts false, only a real true counts, and an old backup without it loads", () => {
  assert.equal(defaultState().profile.tourSeen, false);
  assert.equal(sanitizeState({ profile: { tourSeen: true } }).profile.tourSeen, true);
  assert.equal(sanitizeState({ profile: { tourSeen: "yes" } }).profile.tourSeen, false);
  const old = JSON.parse(exportJSON(defaultState(), new Date()));
  delete old.profile.tourSeen;
  const parsed = parseBackup(JSON.stringify(old));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.state.profile.tourSeen, false);
});

test("restoring a backup counts as having seen the tour, and a merge keeps this device's answer", () => {
  const incoming = defaultState();
  incoming.profile.onboarded = true;
  assert.equal(replaceState(incoming, defaultState()).profile.tourSeen, true);
  const current = defaultState();
  current.profile.onboarded = true;
  current.profile.tourSeen = true;
  incoming.profile.tourSeen = false;
  assert.equal(mergeStates(current, incoming).state.profile.tourSeen, true);
});
