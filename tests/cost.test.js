import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCost, fmtMoney, costByMonth, costSummary } from "../js/cost.js";
import { defaultState, sanitizeState, parseBackup, exportJSON, mergeStates } from "../js/store.js";
import { session } from "./helpers.js";

test("a cost is a sensible amount to the cent, or nothing", () => {
  assert.equal(sanitizeCost(18), 18);
  assert.equal(sanitizeCost("18.5"), 18.5);
  assert.equal(sanitizeCost("18.456"), 18.46);
  assert.equal(sanitizeCost(0), 0, "free is a real answer");
  assert.equal(sanitizeCost("0"), 0);
  for (const bad of ["", "  ", "abc", -1, 1000, 1e9, NaN, Infinity, null, undefined, {}, [], true]) assert.equal(sanitizeCost(bad), null, String(bad));
});

test("money reads like money", () => {
  assert.equal(fmtMoney(18), "$18");
  assert.equal(fmtMoney(18.5), "$18.50");
  assert.equal(fmtMoney(18.456), "$18.46");
  assert.equal(fmtMoney(1240), "$1,240");
  assert.equal(fmtMoney(0), "$0");
});

const costed = (date, cost, onIceSec = 3600) => ({ ...session(date, { onIceSec }), cost });

test("months add up what was paid, leave out sessions with no cost, and work out dollars per hour from the costed ones only", () => {
  const sessions = [costed("2026-10-03", 18), costed("2026-10-10", 12, 1800), { ...session("2026-10-12", { onIceSec: 7200 }), cost: null }, costed("2026-09-20", 15), costed("2026-07-01", 20)];
  const months = costByMonth(sessions, "2026-10-17", 4);
  assert.deepEqual(months.map((m) => m.month), ["2026-10", "2026-09", "2026-08", "2026-07"]);
  const oct = months[0];
  assert.deepEqual([oct.sessions, oct.costed, oct.unknown, oct.total], [3, 2, 1, 30]);
  assert.equal(oct.perSession, 15);
  assert.equal(oct.perHour, 20, "$30 over the 1.5 hours that have a cost, not the 3.5 hours skated");
  assert.equal(oct.hours, 3.5, "all the hours are still shown");
  assert.deepEqual([months[2].sessions, months[2].total, months[2].perHour, months[2].perSession], [0, 0, null, null], "an empty month is still listed");
  assert.equal(months[3].total, 20);
});

test("a free session counts as costed at zero and pulls the average down", () => {
  const got = costByMonth([costed("2026-10-03", 20), costed("2026-10-04", 0)], "2026-10-17", 1)[0];
  assert.deepEqual([got.costed, got.total, got.perSession], [2, 20, 10]);
});

test("the summary has this month and everything", () => {
  const sessions = [costed("2026-10-03", 18), costed("2026-09-20", 15), { ...session("2026-08-01"), cost: null }];
  const got = costSummary(sessions, "2026-10-17");
  assert.equal(got.thisMonth.total, 18);
  assert.deepEqual([got.all.total, got.all.costed, got.all.unknown, got.all.sessions], [33, 2, 1, 3]);
  assert.deepEqual(costSummary([], "2026-10-17").all, { sessions: 0, costed: 0, unknown: 0, total: 0, hours: 0, perSession: null, perHour: null });
});

test("months roll over the year", () => {
  assert.deepEqual(costByMonth([], "2026-02-10", 3).map((m) => m.month), ["2026-02", "2026-01", "2025-12"]);
});

test("cost is saved with a session, cleaned, and old backups without it still load", () => {
  const state = defaultState();
  state.sessions.push({ ...session("2026-10-05"), cost: 18.5 });
  state.profile.defaultCost = 16;
  state.plan.cost = 12;
  const back = parseBackup(exportJSON(state)).state;
  assert.equal(back.sessions[0].cost, 18.5);
  assert.equal(back.profile.defaultCost, 16);
  assert.equal(back.plan.cost, 12);
  const dirty = sanitizeState({ sessions: [{ ...session("2026-10-05"), cost: "lots" }, { ...session("2026-10-06"), cost: -5 }], profile: { defaultCost: 99999 }, plan: { cost: "x" } });
  assert.deepEqual(dirty.sessions.map((s) => s.cost), [null, null]);
  assert.equal(dirty.profile.defaultCost, null);
  assert.equal(dirty.plan.cost, null);
  const old = JSON.parse(exportJSON(state));
  delete old.sessions[0].cost;
  delete old.profile.defaultCost;
  delete old.plan.cost;
  const parsed = parseBackup(JSON.stringify(old)).state;
  assert.deepEqual([parsed.sessions[0].cost, parsed.profile.defaultCost, parsed.plan.cost], [null, null, null]);
});

test("merging keeps the cost you already have on a session", () => {
  const mine = defaultState();
  const theirs = defaultState();
  const shared = session("2026-10-05");
  mine.sessions.push({ ...shared, cost: 18 });
  theirs.sessions.push({ ...shared, cost: 99 }, { ...session("2026-10-06"), cost: 12 });
  const { state } = mergeStates(mine, theirs);
  assert.deepEqual(state.sessions.map((s) => s.cost), [18, 12]);
});

test("dollars per hour needs at least 15 minutes on the ice behind it", () => {
  const tiny = costByMonth([costed("2026-10-03", 16, 2)], "2026-10-17", 1)[0];
  assert.deepEqual([tiny.total, tiny.perSession, tiny.perHour], [16, 16, null], "a session that lasted 2 seconds has no hourly rate");
  assert.equal(costByMonth([costed("2026-10-03", 16, 900)], "2026-10-17", 1)[0].perHour, 64, "15 minutes is enough: $16 for a quarter hour");
  assert.equal(costByMonth([costed("2026-10-03", 16, 899)], "2026-10-17", 1)[0].perHour, null);
  assert.equal(Math.round(costSummary([costed("2026-10-03", 16, 2), costed("2026-10-04", 20, 3600)], "2026-10-17").all.perHour), 36, "short sessions still count once the total is enough");
});
