import test from "node:test";
import assert from "node:assert/strict";
import { BADGES, GROUPS, evaluateBadges, newlyEarned, badgeRatio, progressText, streakAsOf } from "../js/badges.js";
import { streakWeeks } from "../js/xp.js";
import { todayISO, weekKey } from "../js/util.js";
import { realCatalog, session } from "./helpers.js";

const catalog = realCatalog();
const got = (sessions, extra = {}) => evaluateBadges({ sessions, sharpenings: [], backupAt: null, catalog, ...extra });
const one = (list, id) => list.find((b) => b.id === id);
const skillOfCat = (cat) => [...catalog.skills.values()].find((s) => s.cat === cat && !s.bonus).id;
const entry = (skillId, o = {}) => ({ skillId, stars: 0, landed: 0, attempts: 0, note: "", ...o });
const min = (m) => m * 60;

test("every badge has a unique id, a group, words, an icon in the sprite, and a goal", () => {
  const ids = BADGES.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
  const sprite = readSprite();
  for (const b of BADGES) {
    assert.ok(GROUPS.includes(b.group), `${b.id}: group`);
    assert.ok(b.name && b.text && b.goal > 0, `${b.id}: words and goal`);
    assert.ok(sprite.includes(`id="i-${b.icon}"`), `${b.id}: icon ${b.icon} is not in index.html`);
  }
});

import { readFileSync } from "node:fs";
function readSprite() {
  return readFileSync(new URL("../index.html", import.meta.url), "utf8");
}

test("with no sessions nothing is earned and nothing is counted", () => {
  const list = got([]);
  assert.equal(list.length, BADGES.length);
  assert.equal(list.filter((b) => b.earned).length, 0);
  assert.ok(list.every((b) => b.earnedOn === null && b.sessionsTaken === null));
  assert.equal(one(list, "level-3").value, 1, "you start at level 1");
});

test("a badge records the day it was earned and how many sessions and days it took", () => {
  const dates = ["2026-10-01", "2026-10-03", "2026-10-07", "2026-10-09", "2026-10-12"];
  const four = got(dates.slice(0, 4).map((d) => session(d)));
  assert.equal(one(four, "first-session").earned, true);
  assert.deepEqual([one(four, "first-session").earnedOn, one(four, "first-session").sessionsTaken, one(four, "first-session").daysTaken], ["2026-10-01", 1, 1]);
  assert.equal(one(four, "sessions-5").earned, false);
  assert.equal(one(four, "sessions-5").value, 4);
  const five = one(got(dates.map((d) => session(d))), "sessions-5");
  assert.deepEqual([five.earned, five.earnedOn, five.sessionsTaken, five.daysTaken], [true, "2026-10-12", 5, 12]);
});

test("sessions are replayed in the order they were skated, however they are listed", () => {
  const a = session("2026-10-01");
  const b = session("2026-10-05");
  assert.deepEqual(got([b, a]).map((x) => x.earnedOn), got([a, b]).map((x) => x.earnedOn));
});

test("ten sessions in one month is a full month, but five and five is not", () => {
  const same = Array.from({ length: 10 }, (_, i) => session(`2026-10-${String(i + 1).padStart(2, "0")}`));
  assert.equal(one(got(same), "month-10").earned, true);
  const split = [...Array.from({ length: 5 }, (_, i) => session(`2026-09-${String(i + 1).padStart(2, "0")}`)), ...Array.from({ length: 5 }, (_, i) => session(`2026-10-${String(i + 1).padStart(2, "0")}`))];
  const list = got(split);
  assert.equal(one(list, "month-10").earned, false);
  assert.equal(one(list, "month-10").value, 5);
  assert.equal(one(list, "sessions-10").earned, true);
});

test("time on ice adds up across sessions, and one long session counts on its own", () => {
  const list = got([session("2026-10-01", { onIceSec: min(40) }), session("2026-10-02", { onIceSec: min(30) })]);
  assert.deepEqual([one(list, "hour-1").earned, one(list, "hour-1").earnedOn], [true, "2026-10-02"]);
  assert.equal(one(list, "long-90").earned, false);
  assert.equal(progressText(one(list, "hours-10")), "1.2 of 10 h");
  assert.equal(progressText(one(list, "long-90")), "40 of 90 min");
  assert.equal(one(got([session("2026-10-01", { onIceSec: min(95) })]), "long-90").earned, true);
  assert.equal(one(got([session("2026-10-01", { onIceSec: min(89) })]), "long-90").earned, false);
  assert.equal(one(got([session("2026-10-01", { onIceSec: min(1572) })]), "marathon").earned, true);
  assert.equal(one(got([session("2026-10-01", { onIceSec: min(1571) })]), "marathon").earned, false);
});

test("a skill counts as earned at its best rating, so a bad day later cannot take it away", () => {
  const id = skillOfCat("skills");
  const list = got([session("2026-10-01", { stars: { [id]: 4 } }), session("2026-10-08", { stars: { [id]: 2 } })]);
  assert.equal(one(list, "skill-1").earned, true);
  assert.equal(one(list, "skill-5").value, 1);
  assert.equal(one(got([session("2026-10-01", { stars: { [id]: 3 } })]), "skill-1").earned, false);
});

test("five skates, and beating your own best, are counted separately", () => {
  const id = skillOfCat("skills");
  const first = got([session("2026-10-01", { stars: { [id]: 5 } })]);
  assert.equal(one(first, "five-1").earned, true);
  assert.equal(one(first, "pb-1").earned, false, "a first rating has nothing to beat");
  const climb = got([session("2026-10-01", { stars: { [id]: 3 } }), session("2026-10-08", { stars: { [id]: 4 } }), session("2026-10-15", { stars: { [id]: 4 } })]);
  assert.deepEqual([one(climb, "pb-1").earned, one(climb, "pb-1").earnedOn, one(climb, "pb-10").value], [true, "2026-10-08", 1]);
});

test("a level is complete when every skill in it has been earned", () => {
  const levels = [...catalog.levels.values()].filter((l) => l.trackId === "lts-basic");
  const level = levels.reduce((small, l) => (l.skillIds.length < small.skillIds.length ? l : small));
  const ids = level.skillIds.filter((id) => !catalog.skills.get(id).bonus);
  const all = got([session("2026-10-01", { stars: Object.fromEntries(ids.map((id) => [id, 4])) })]);
  assert.equal(one(all, "level-done").earned, true);
  const missing = got([session("2026-10-01", { stars: Object.fromEntries(ids.slice(1).map((id) => [id, 4])) })]);
  assert.equal(one(missing, "level-done").earned, false);
  assert.equal(one(got([session("2026-10-01", { stars: Object.fromEntries(ids.map((id) => [id, 4])) })], { catalog: null }), "level-done").earned, false, "without the catalog levels cannot be known");
});

test("landed jumps add up, and a jump you land most of the time is dialed in", () => {
  const id = skillOfCat("jumps");
  const ten = got([session("2026-10-01", { extra: [entry(id, { landed: 6, attempts: 9 }), entry(skillOfCat("spins"), { landed: 4, attempts: 5 })] })]);
  assert.equal(one(ten, "landed-10").earned, true);
  assert.equal(one(ten, "dialed-in").earned, false, "too few tries");
  const across = got([session("2026-10-01", { extra: [entry(id, { landed: 10, attempts: 12 })] }), session("2026-10-08", { extra: [entry(id, { landed: 8, attempts: 8 })] })]);
  assert.deepEqual([one(across, "dialed-in").earned, one(across, "dialed-in").earnedOn], [true, "2026-10-08"]);
  assert.equal(one(got([session("2026-10-01", { extra: [entry(id, { landed: 15, attempts: 20 })] })]), "dialed-in").earned, false, "75 percent");
  assert.equal(one(got([session("2026-10-01", { extra: [entry(id, { landed: 16, attempts: 20 })] })]), "dialed-in").earned, true, "80 percent");
});

test("weekly streaks need enough sessions every week, in a row", () => {
  const twoWeeks = ["2026-10-05", "2026-10-08", "2026-10-12", "2026-10-15"].map((d) => session(d));
  const list = got(twoWeeks);
  assert.deepEqual([one(list, "streak-2").earned, one(list, "streak-2").earnedOn, one(list, "streak-2").sessionsTaken], [true, "2026-10-15", 4]);
  assert.equal(one(list, "streak-4").value, 2);
  const gap = got(["2026-10-05", "2026-10-08", "2026-10-19", "2026-10-22"].map((d) => session(d)));
  assert.equal(one(gap, "streak-2").earned, false, "a week with no sessions breaks it");
  const single = got(["2026-10-05", "2026-10-12", "2026-10-19"].map((d) => session(d)));
  assert.equal(one(single, "streak-2").earned, false, "one session a week is not enough");
});

test("the running streak count gives the same answer as the streak on the Home screen", () => {
  const dates = ["2026-09-01", "2026-09-03", "2026-09-08", "2026-09-10", "2026-09-22", "2026-09-24", "2026-09-29", "2026-10-01", "2026-10-06", "2026-10-08", "2026-10-13", "2026-10-15"];
  const sessions = dates.map((d) => session(d));
  const counts = new Map();
  dates.forEach((d, i) => {
    counts.set(weekKey(d), (counts.get(weekKey(d)) || 0) + 1);
    assert.equal(streakAsOf(counts, d), streakWeeks(sessions.slice(0, i + 1), d).weeks, d);
  });
});

test("notes count whether they are on a skill or on the session", () => {
  const id = skillOfCat("skills");
  const s1 = session("2026-10-01", { extra: [entry(id, { note: "eyes up" }), entry(skillOfCat("jumps"), { note: "arms in" }), entry(skillOfCat("spins"), { note: "   " })] });
  const s2 = { ...session("2026-10-08", { extra: [entry(id, { note: "better" })] }), note: "good day" };
  const list = got([s1, s2]);
  assert.equal(one(list, "notes-5").value, 4, "a blank note is not a note");
  assert.equal(one(got([s1, s2, { ...session("2026-10-15"), note: "again" }]), "notes-5").earned, true);
});

test("an all-rounder works on a skill, a jump, and a spin in one session", () => {
  const three = session("2026-10-01", { stars: { [skillOfCat("skills")]: 3, [skillOfCat("jumps")]: 3, [skillOfCat("spins")]: 3 } });
  assert.equal(one(got([three]), "variety").earned, true);
  const spread = [session("2026-10-01", { stars: { [skillOfCat("skills")]: 3 } }), session("2026-10-02", { stars: { [skillOfCat("jumps")]: 3, [skillOfCat("spins")]: 3 } })];
  assert.equal(one(got(spread), "variety").earned, false, "it has to be one session");
  assert.equal(one(got([three], { catalog: null }), "variety").earned, false);
});

test("a sharpening or a backup earns its badge on its own day, even after the last session or with no sessions", () => {
  const sessions = [session("2026-10-01"), session("2026-10-05"), session("2026-10-12")];
  const list = got(sessions, { sharpenings: [{ date: "2026-10-09", hours: 20 }, { date: "2026-11-01", hours: 20 }], backupAt: "2026-10-20T20:00:00.000Z" });
  const sharp = one(list, "sharpened");
  assert.deepEqual([sharp.earned, sharp.earnedOn, sharp.sessionsTaken], [true, "2026-10-09", 2]);
  const backup = one(list, "backup");
  assert.deepEqual([backup.earned, backup.earnedOn, backup.sessionsTaken], [true, todayISO(new Date("2026-10-20T20:00:00.000Z")), 3]);
  const none = got([], { sharpenings: [{ date: "2026-10-09", hours: 3 }] });
  assert.deepEqual([one(none, "sharpened").earned, one(none, "sharpened").sessionsTaken, one(none, "sharpened").daysTaken], [true, 0, 1]);
  assert.equal(one(got([session("2026-10-01")], { backupAt: "not a date" }), "backup").earned, false);
  assert.equal(one(got(sessions), "sharpened").earned, false);
});

test("levels come from the XP replay, on the session that crossed them", () => {
  const long = (d) => session(d, { onIceSec: min(180) });
  const list = got([long("2026-10-01"), long("2026-10-08"), long("2026-10-15")]);
  const l3 = one(list, "level-3");
  assert.deepEqual([l3.earned, l3.earnedOn, l3.sessionsTaken], [true, "2026-10-08", 2]);
  assert.equal(one(list, "level-5").earned, false);
});

test("working out badges does not change the sessions, and gives the same answer twice", () => {
  const sessions = [session("2026-10-08", { stars: { [skillOfCat("skills")]: 4 } }), session("2026-10-01")];
  const before = JSON.stringify(sessions);
  const a = got(sessions);
  assert.equal(JSON.stringify(sessions), before);
  assert.deepEqual(got(sessions), a);
});

test("adding a session updates the answer (the last answer is not reused by mistake)", () => {
  const sessions = [session("2026-10-01")];
  assert.equal(one(got(sessions), "sessions-5").value, 1);
  sessions.push(session("2026-10-02"));
  assert.equal(one(got(sessions), "sessions-5").value, 2);
  const longer = [{ ...session("2026-10-01"), onIceSec: min(100) }];
  assert.equal(one(got(longer), "long-90").earned, true);
  longer[0] = { ...longer[0], onIceSec: min(20) };
  assert.equal(one(got(longer), "long-90").earned, false, "same count and id, different time");
});

test("new badges are the earned ones you have not seen, and progress is a ratio", () => {
  const list = got([session("2026-10-01", { onIceSec: min(10) })]);
  assert.deepEqual(newlyEarned(list, []).map((b) => b.id), ["first-session"]);
  assert.deepEqual(newlyEarned(list, ["first-session"]), []);
  assert.equal(badgeRatio(one(list, "first-session")), 1);
  assert.equal(badgeRatio(one(list, "sessions-5")), 0.2);
  assert.equal(badgeRatio(one(got([]), "sessions-5")), 0);
});

test("level badges read as 'Level 2 of 3'", () => {
  assert.equal(progressText(one(got([session("2026-10-01", { onIceSec: min(10) })]), "level-3")), "Level 1 of 3");
});
