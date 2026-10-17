import test from "node:test";
import assert from "node:assert/strict";
import { shiftMonth, plannedByDay, monthGrid } from "../js/calendar.js";
import { sanitizeIceSession } from "../js/ice.js";
import { session } from "./helpers.js";

const grid = (ym, sessions = [], iceSessions = [], today = "2026-10-17") => monthGrid(ym, { sessions, iceSessions }, today);
const cells = (g) => g.weeks.flatMap((w) => w.days).filter(Boolean);
const pick = (o) => sanitizeIceSession({ id: "p" + Math.random().toString(36).slice(2, 7), rinkId: "r1", kind: "freestyle", days: [2], start: "14:00", end: "15:00", pick: true, ...o });

test("months move forward and back across the year", () => {
  assert.equal(shiftMonth("2026-10", 1), "2026-11");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-10", 0), "2026-10");
  assert.equal(shiftMonth("2026-03", -13), "2025-02");
});

test("a month has the right days, starting on the right weekday (Monday first)", () => {
  const oct = grid("2026-10"); // October 1, 2026 is a Thursday
  assert.equal(cells(oct).length, 31);
  assert.deepEqual(oct.weeks[0].days.map((d) => d && d.day), [null, null, null, 1, 2, 3, 4]);
  assert.ok(oct.weeks.every((w) => w.days.length === 7));
  assert.equal(oct.weeks.length, 5);
  assert.deepEqual(oct.weeks[4].days.map((d) => d && d.day), [26, 27, 28, 29, 30, 31, null]);
  const feb = grid("2028-02"); // a leap year, Feb 1 is a Tuesday
  assert.equal(cells(feb).length, 29);
  assert.deepEqual(feb.weeks[0].days.map((d) => d && d.day).slice(0, 3), [null, 1, 2]);
  const mondayStart = grid("2026-06"); // June 1, 2026 is a Monday: no empty days in front
  assert.equal(mondayStart.weeks[0].days[0].day, 1);
  assert.equal(grid("2026-11").weeks[0].days[6].day, 1, "Nov 1, 2026 is a Sunday: a week of six empty days then the 1st");
  assert.equal(grid("2026-03").weeks.length, 6);
});

test("days you skated show how many sessions and how many minutes, and today is marked", () => {
  const sessions = [session("2026-10-05", { onIceSec: 1800 }), session("2026-10-05", { onIceSec: 3600 }), session("2026-10-12", { onIceSec: 2700 }), session("2026-09-30", { onIceSec: 3600 })];
  const g = grid("2026-10", sessions);
  const day = (n) => cells(g).find((c) => c.day === n);
  assert.deepEqual([day(5).sessions, day(5).minutes], [2, 90]);
  assert.deepEqual([day(12).sessions, day(12).minutes], [1, 45]);
  assert.deepEqual([day(6).sessions, day(6).minutes], [0, 0]);
  assert.equal(day(17).today, true);
  assert.equal(day(18).today, false);
  assert.deepEqual([g.daysSkated, g.sessions, g.minutes], [2, 3, 135], "September's session is not counted in October");
});

test("a week is marked when it has enough sessions for a streak", () => {
  const sessions = [session("2026-10-05"), session("2026-10-08"), session("2026-10-13")];
  const g = grid("2026-10", sessions);
  assert.deepEqual(g.weeks.map((w) => w.streak), [false, true, false, false, false], "Oct 5 and 8 are the week of the 5th; one session on the 13th is not enough");
  const across = grid("2026-11", [session("2026-10-28"), session("2026-10-30"), session("2026-11-01")]);
  assert.equal(across.weeks[0].streak, true, "a week that begins in October counts its October sessions too");
});

test("planned ice shows on the days still to come, from picked sessions only", () => {
  const tue = pick({ days: [2] });
  const unpicked = pick({ days: [3], pick: false });
  const oneOff = pick({ days: [], date: "2026-10-24", start: "10:00", end: "11:00" });
  const limited = pick({ days: [4], from: "2026-10-22", to: "2026-10-22" });
  const planned = plannedByDay([tue, unpicked, oneOff, limited], "2026-10-01", "2026-10-31", "2026-10-17");
  assert.deepEqual(Object.keys(planned).sort(), ["2026-10-20", "2026-10-22", "2026-10-24", "2026-10-27"], "Tuesdays after today, the one-off, and the single Thursday");
  assert.equal(planned["2026-10-13"], undefined, "days before today are not planned");
  const twice = plannedByDay([tue, pick({ days: [2], start: "18:00", end: "19:00" })], "2026-10-01", "2026-10-31", "2026-10-17");
  assert.equal(twice["2026-10-20"], 2);
  const g = grid("2026-10", [], [tue, oneOff]);
  assert.equal(cells(g).find((c) => c.day === 20).planned, 1);
  assert.equal(cells(g).find((c) => c.day === 6).planned, 0);
  assert.deepEqual(plannedByDay([], "2026-10-01", "2026-10-31"), {});
});

test("a past month has no planned ice, and an empty month still draws", () => {
  const g = grid("2026-08", [], [pick({ days: [2] })]);
  assert.equal(cells(g).length, 31);
  assert.ok(cells(g).every((c) => c.planned === 0 && c.sessions === 0));
  assert.deepEqual([g.daysSkated, g.sessions, g.minutes], [0, 0, 0]);
});
