import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS, sanitizeElement, sanitizeProgram, sanitizeEvent, sanitizeEvents, sanitizeResult, sanitizeDayItem, cleanCompete,
  fmtMmSs, parseMmSs, daysUntil, countdownText, upcomingEvents, pastEvents, nextEvent, ordinal, placingText,
  newProgram, newEvent, programStatus, readiness, nextSpot, addElement, updateElement, moveElement, removeElement, shiftElement,
  spreadEvenly, setLength, addMoment, removeMoment, timelineBlocks, overlaps, programSpan, cueAt, routePoints, smoothPath,
  seasonLabel, roman, sortDay, dayRange, parseCompeteHash, competeHref, DEFAULT_BRING,
} from "../js/compete.js";

let n = 0;
const mk = () => "id" + ++n;
const program = (extra = {}) => newProgram({ name: "Moonlight", music: { title: "Clair de Lune", artist: "Debussy" }, lengthSec: 90, ...extra }, mk, "2026-10-17");
const withThree = () => {
  let p = program();
  for (const label of ["Mohawk sequence", "Waltz jump", "Mazurka"]) p = addElement(p, { label, type: "move" }, mk).program;
  return p;
};

test("an element needs an id and a name, and everything else is made safe", () => {
  assert.equal(sanitizeElement({ id: "", label: "Jump" }), null);
  assert.equal(sanitizeElement({ id: "a", label: "   " }), null);
  assert.equal(sanitizeElement(null), null);
  const e = sanitizeElement({ id: "a", label: "  Waltz\u0000  jump ", type: "dance", x: 3, y: -1, at: 12.6, dur: -5 });
  assert.equal(e.label, "Waltz jump");
  assert.equal(e.type, "move", "an unknown type becomes a plain move");
  assert.equal(e.x, 1, "a spot is kept on the rink");
  assert.equal(e.y, 0);
  assert.equal(e.at, 13);
  assert.equal(e.dur, 0);
  assert.equal(sanitizeElement({ id: "a", label: "x", x: 0.5 }).x, null, "half a spot is no spot");
  assert.equal(sanitizeElement({ id: "a", label: "x", at: "soon" }).at, null);
});

test("a program is cleaned: length, kind, music, and times inside the music", () => {
  const p = sanitizeProgram({ id: "p", name: "", music: { title: 5, artist: "A".repeat(500) }, lengthSec: 5, kind: "gala", eventId: 7, elements: [{ id: "a", label: "Spin", at: 200, dur: 50 }] });
  assert.equal(p.name, "My program");
  assert.equal(p.music.title, "");
  assert.equal(p.music.artist.length, LIMITS.text);
  assert.equal(p.lengthSec, LIMITS.lengthMin, "a length is kept in range");
  assert.equal(p.kind, "free");
  assert.equal(p.eventId, "");
  assert.equal(p.elements[0].at, LIMITS.lengthMin, "an element cannot start after the music ends");
  assert.equal(p.elements[0].dur, 0, "or run past it");
  assert.equal(sanitizeProgram({ id: "" }), null);
  assert.equal(sanitizeProgram(null), null);
});

test("repeated ids and too many elements are dropped", () => {
  const els = Array.from({ length: 60 }, (_, i) => ({ id: "e" + (i % 50), label: "E" + i }));
  const p = sanitizeProgram({ id: "p", elements: els });
  assert.equal(p.elements.length, LIMITS.elements);
  assert.equal(new Set(p.elements.map((e) => e.id)).size, p.elements.length);
});

test("an event needs a real day; its day items need a real time", () => {
  assert.equal(sanitizeEvent({ id: "e", date: "next week" }), null);
  assert.equal(sanitizeEvent({ id: "", date: "2026-11-14" }), null);
  const e = sanitizeEvent({ id: "e", name: "", date: "2026-11-14", day: [{ id: "d1", label: "Warm-up", time: "09:10", mins: 15 }, { id: "d2", label: "Bad", time: "9:10" }, { id: "d3", label: "", time: "10:00" }] });
  assert.equal(e.name, "Competition");
  assert.equal(e.day.length, 1);
  assert.deepEqual(e.day[0], { id: "d1", label: "Warm-up", time: "09:10", mins: 15, mine: false });
  assert.equal(sanitizeDayItem({ id: "d", label: "x", time: "25:00" }), null);
});

test("a result keeps a placing that makes sense, and only known marks", () => {
  assert.equal(sanitizeResult("won"), null);
  const r = sanitizeResult({ placing: 2, of: 9, marks: { a: "clean", b: "great", c: "fell" }, note: "Fine", coach: "x".repeat(900), recordedOn: "2026-11-14" });
  assert.equal(r.placing, 2);
  assert.equal(r.of, 9);
  assert.deepEqual(r.marks, { a: "clean", c: "fell" });
  assert.equal(r.coach.length, LIMITS.note);
  assert.equal(sanitizeResult({ placing: 5, of: 3 }).of, null, "you cannot place fifth of three");
  assert.equal(sanitizeResult({ of: 9 }).of, null, "a field size alone means nothing");
  assert.equal(sanitizeResult({ placing: 0 }).placing, 1, "a placing starts at first");
});

test("programs point only at events that exist, and results only at programs that exist", () => {
  const ev = { id: "e1", date: "2026-11-14" };
  const raw = cleanCompete([{ ...ev, result: { placing: 1, programId: "gone" } }], [{ id: "p1", eventId: "e1" }, { id: "p2", eventId: "nope" }]);
  assert.equal(raw.programs[0].eventId, "e1");
  assert.equal(raw.programs[1].eventId, "");
  assert.equal(raw.events[0].result.programId, "");
});

test("times print and read as minutes and seconds", () => {
  assert.equal(fmtMmSs(90), "1:30");
  assert.equal(fmtMmSs(5), "0:05");
  assert.equal(fmtMmSs(-4), "0:00");
  assert.equal(fmtMmSs("x"), "0:00");
  assert.equal(parseMmSs("1:30"), 90);
  assert.equal(parseMmSs(" 0:05 "), 5);
  assert.equal(parseMmSs("90"), 90);
  assert.equal(parseMmSs("1:75"), null);
  assert.equal(parseMmSs("1:3"), null);
  assert.equal(parseMmSs("abc"), null);
  assert.equal(parseMmSs(""), null);
  assert.equal(parseMmSs("-5"), null);
});

test("the countdown, and which events are coming up", () => {
  assert.equal(daysUntil("2026-11-14", "2026-10-17"), 28);
  assert.equal(daysUntil("2026-10-17", "2026-10-17"), 0);
  assert.equal(countdownText(28), "28 days");
  assert.equal(countdownText(1), "Tomorrow");
  assert.equal(countdownText(0), "Today");
  assert.equal(countdownText(-1), "Yesterday");
  assert.equal(countdownText(-9), "9 days ago");
  const events = sanitizeEvents([{ id: "a", date: "2026-12-01" }, { id: "b", date: "2026-10-20" }, { id: "c", date: "2026-09-01" }, { id: "d", date: "2026-10-17" }, { id: "e", date: "2026-03-06" }]);
  assert.deepEqual(upcomingEvents(events, "2026-10-17").map((e) => e.id), ["d", "b", "a"], "today counts as upcoming, soonest first");
  assert.deepEqual(pastEvents(events, "2026-10-17").map((e) => e.id), ["c", "e"], "the most recent past event first");
  assert.equal(nextEvent(events, "2026-10-17").id, "d");
  assert.equal(nextEvent([], "2026-10-17"), null);
});

test("places: 1st, 2nd, 3rd, 11th, 12th, 13th, 21st, 112th", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 112].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th", "112th"]);
  assert.equal(placingText({ placing: 2, of: 9 }), "2nd of 9");
  assert.equal(placingText({ placing: 3, of: null }), "3rd");
  assert.equal(placingText({ placing: null }), "");
  assert.equal(placingText(null), "");
});

test("a new program and a new event start tidy, and an event starts with a packing list", () => {
  const p = program({ kind: "short", eventId: "e1" });
  assert.equal(p.kind, "short");
  assert.equal(p.created, "2026-10-17");
  assert.deepEqual(p.elements, []);
  const e = newEvent({ name: "Fall Classic", date: "2026-11-14", place: "Highland Ice Arena" }, mk);
  assert.equal(e.bring.length, DEFAULT_BRING.length);
  assert.ok(e.bring.every((b) => b.done === false));
  assert.equal(new Set(e.bring.map((b) => b.id)).size, e.bring.length);
  assert.equal(newEvent({ name: "x", date: "not a day" }, mk), null);
});

test("adding elements puts them on the rink one after another, and never on top of each other", () => {
  const p = withThree();
  assert.equal(p.elements.length, 3);
  const spots = p.elements.map((e) => `${e.x},${e.y}`);
  assert.equal(new Set(spots).size, 3);
  assert.ok(p.elements.every((e) => e.x > 0 && e.x < 1 && e.y > 0 && e.y < 1));
  const tapped = addElement(p, { label: "Spin", type: "spin", x: 0.4, y: 0.6 }, mk);
  assert.equal(tapped.element.x, 0.4);
  assert.equal(tapped.element.type, "spin");
  assert.equal(addElement(p, { label: "  " }, mk).status, "invalid");
  assert.deepEqual(nextSpot([]), { x: 0.174, y: 0.32 }, "the first spot is near the start");
});

test("a program holds up to the limit of elements", () => {
  let p = program();
  for (let i = 0; i < LIMITS.elements; i++) p = addElement(p, { label: "E" + i }, mk).program;
  const over = addElement(p, { label: "One more" }, mk);
  assert.equal(over.status, "full");
  assert.equal(over.program.elements.length, LIMITS.elements);
});

test("moving, editing, removing and reordering elements leaves the others alone", () => {
  const p = withThree();
  const [a, b, c] = p.elements;
  const moved = moveElement(p, b.id, 0.9, 5);
  assert.equal(moved.elements[1].x, 0.9);
  assert.equal(moved.elements[1].y, 1, "kept on the rink");
  assert.equal(moved.elements[0].x, a.x);
  const renamed = updateElement(p, c.id, { label: "Mazurka, both feet", type: "steps" });
  assert.equal(renamed.elements[2].label, "Mazurka, both feet");
  assert.equal(renamed.elements[2].type, "steps");
  assert.equal(renamed.elements[2].id, c.id, "an edit cannot change an id");
  assert.equal(removeElement(p, a.id).elements.length, 2);
  assert.deepEqual(shiftElement(p, a.id, 1).elements.map((e) => e.id), [b.id, a.id, c.id]);
  assert.deepEqual(shiftElement(p, a.id, -1).elements.map((e) => e.id), [a.id, b.id, c.id], "the first cannot move earlier");
  assert.deepEqual(shiftElement(p, c.id, 1).elements.map((e) => e.id), [a.id, b.id, c.id], "the last cannot move later");
  assert.equal(shiftElement(p, "nope", 1), p);
});

test("progress: elements chosen, all placed, all timed", () => {
  let p = program();
  assert.deepEqual(programStatus(p).steps, { elements: false, layout: false, timing: false });
  p = withThree();
  let s = programStatus(p);
  assert.equal(s.placed, 3);
  assert.equal(s.timed, 0);
  assert.equal(s.planned, 0);
  assert.equal(s.steps.layout, true);
  assert.equal(s.steps.timing, false);
  assert.equal(s.done, false);
  p = spreadEvenly(p);
  s = programStatus(p);
  assert.equal(s.timed, 3);
  assert.equal(s.planned, 3);
  assert.equal(s.done, true);
  const unplaced = sanitizeProgram({ ...p, elements: [...p.elements, { id: "z", label: "Late idea" }] });
  assert.equal(programStatus(unplaced).planned, 3, "an element with no spot and no time is not planned yet");
  assert.equal(programStatus(unplaced).steps.layout, false);
});

test("spreading evenly gives everyone a start and a length inside the music, in order", () => {
  const p = spreadEvenly(withThree());
  assert.deepEqual(p.elements.map((e) => e.at), [0, 30, 60]);
  assert.ok(p.elements.every((e) => e.dur >= 3 && e.at + e.dur <= p.lengthSec));
  assert.deepEqual(overlaps(p), []);
  assert.equal(spreadEvenly(program()).elements.length, 0);
  let many = program({ lengthSec: 20 });
  for (let i = 0; i < 12; i++) many = addElement(many, { label: "E" + i }, mk).program;
  const tight = spreadEvenly(many);
  assert.ok(tight.elements.every((e) => e.at + e.dur <= 20), "even a crowded short program stays inside the music");
});

test("a shorter piece of music pulls every time back inside it", () => {
  const p = spreadEvenly(withThree());
  const shorter = setLength(p, 40);
  assert.ok(shorter.elements.every((e) => e.at <= 40 && e.at + e.dur <= 40));
  assert.equal(shorter.lengthSec, 40);
  assert.equal(setLength(p, 99999).lengthSec, LIMITS.lengthMax);
});

test("music moments are kept in order, with a limit", () => {
  let p = program();
  p = addMoment(p, { at: 65, text: "crescendo" }, mk).program;
  p = addMoment(p, { at: 30, text: "the music swells" }, mk).program;
  assert.deepEqual(p.moments.map((m) => m.text), ["the music swells", "crescendo"]);
  assert.equal(addMoment(p, { at: 5, text: "  " }, mk).status, "invalid");
  assert.equal(removeMoment(p, p.moments[0].id).moments.length, 1);
  for (let i = 0; i < LIMITS.moments; i++) p = addMoment(p, { at: i, text: "m" + i }, mk).program;
  assert.equal(addMoment(p, { at: 1, text: "extra" }, mk).status, "full");
});

test("blocks on the timeline are placed as a share of the music", () => {
  const p = sanitizeProgram({ ...program(), elements: [{ id: "a", label: "Spin", at: 45, dur: 9 }, { id: "b", label: "Pose", at: 0, dur: 0 }, { id: "c", label: "Untimed" }] });
  const blocks = timelineBlocks(p);
  assert.deepEqual(blocks.map((b) => b.id), ["b", "a"], "untimed elements have no block, and blocks run in time order");
  assert.equal(blocks[1].left, 50);
  assert.equal(blocks[1].width, 10);
  assert.ok(blocks[0].width > 0, "a pose with no length still shows");
});

test("overlaps and the room left in the music", () => {
  const p = sanitizeProgram({ ...program(), elements: [{ id: "a", label: "A", at: 10, dur: 15 }, { id: "b", label: "B", at: 20, dur: 10 }, { id: "c", label: "C", at: 40, dur: 5 }, { id: "d", label: "D", at: 25, dur: 0 }] });
  assert.deepEqual(overlaps(p), [["a", "b"], ["b", "d"]], "a ends the moment d starts, so they do not overlap");
  assert.deepEqual(programSpan(p), { lastEnd: 45, room: 45 });
  assert.deepEqual(programSpan(program()), { lastEnd: 0, room: 90 });
});

test("the run-through knows what is on now and what is next", () => {
  const p = spreadEvenly(withThree());
  assert.equal(cueAt(p, 0).now.label, "Mohawk sequence");
  assert.equal(cueAt(p, 0).next.label, "Waltz jump");
  assert.equal(cueAt(p, 0).untilNext, 30);
  const between = cueAt(p, 25);
  assert.equal(between.now, null, "after an element ends and before the next, nothing is on");
  assert.equal(between.next.label, "Waltz jump");
  assert.equal(between.untilNext, 5);
  assert.equal(cueAt(p, 89).next, null);
  assert.equal(cueAt(program(), 10).now, null);
});

test("how many elements are skills you already have", () => {
  let p = program();
  p = addElement(p, { label: "Waltz jump", skillId: "s1" }, mk).program;
  p = addElement(p, { label: "Spin", skillId: "s2" }, mk).program;
  p = addElement(p, { label: "Opening pose" }, mk).program;
  const stats = new Map([["s1", { latest: 4 }], ["s2", { latest: 2 }]]);
  assert.deepEqual(readiness(p, stats), { linked: 2, confident: 1 });
  assert.deepEqual(readiness(p, new Map()), { linked: 2, confident: 0 });
});

test("the route on the rink runs through the placed elements in order, with numbers that match the list", () => {
  let p = withThree();
  p = addElement(p, { label: "Floating idea", x: null, y: null }, mk).program;
  const pts = routePoints(p, 346, 200);
  assert.equal(pts.length, 4);
  assert.deepEqual(pts.map((pt) => pt.n), [1, 2, 3, 4]);
  assert.ok(pts.every((pt) => pt.x >= 0 && pt.x <= 346 && pt.y >= 0 && pt.y <= 200));
  const d = smoothPath(pts);
  assert.match(d, /^M/);
  assert.ok(!/NaN|Infinity/.test(d));
  assert.equal(smoothPath([]), "");
  assert.equal(smoothPath(pts.slice(0, 1)), `M${pts[0].x} ${pts[0].y}`);
  assert.match(smoothPath(pts.slice(0, 2)), /^M[\d. ]+L[\d. ]+$/);
});

test("an event's day is in time order, and the picture covers it in half hours", () => {
  const items = [{ id: "3", label: "Awards", time: "11:30", mins: 0 }, { id: "1", label: "Arrive", time: "07:30", mins: 30 }, { id: "2", label: "Warm-up", time: "09:10", mins: 15 }].map(sanitizeDayItem);
  assert.deepEqual(sortDay(items).map((i) => i.label), ["Arrive", "Warm-up", "Awards"]);
  assert.deepEqual(dayRange(items), { start: 7 * 60 + 30, end: 12 * 60 });
  assert.deepEqual(dayRange([]), { start: 480, end: 720 }, "an empty day still has a morning to draw");
  const late = [{ id: "1", label: "Gala", time: "23:50", mins: 120 }].map(sanitizeDayItem);
  assert.deepEqual(dayRange(late), { start: 23 * 60, end: 24 * 60 }, "a day near midnight starts earlier instead of running past it");
});

test("each view has an address, and a bad one is the hub", () => {
  assert.deepEqual(parseCompeteHash("#/compete"), { view: "hub" });
  assert.deepEqual(parseCompeteHash("#/compete/"), { view: "hub" });
  assert.deepEqual(parseCompeteHash("#/compete/p/abc-123/timing"), { view: "program", id: "abc-123", tab: "timing" });
  assert.deepEqual(parseCompeteHash("#/compete/p/abc"), { view: "program", id: "abc", tab: "layout" });
  assert.deepEqual(parseCompeteHash("#/compete/p/abc/whatever"), { view: "program", id: "abc", tab: "layout" });
  assert.deepEqual(parseCompeteHash("#/compete/e/e1"), { view: "event", id: "e1", results: false });
  assert.deepEqual(parseCompeteHash("#/compete/e/e1/results"), { view: "event", id: "e1", results: true });
  assert.deepEqual(parseCompeteHash("#/compete/x/e1"), { view: "hub" });
  assert.deepEqual(parseCompeteHash("#/compete/p/<script>/layout"), { view: "hub" });
  assert.deepEqual(parseCompeteHash("#/home"), { view: "hub" });
  assert.deepEqual(parseCompeteHash(undefined), { view: "hub" });
  assert.equal(competeHref(), "#/compete");
  assert.equal(competeHref({ view: "program", id: "abc", tab: "timing" }), "#/compete/p/abc/timing");
  assert.equal(competeHref({ view: "program", id: "abc" }), "#/compete/p/abc/layout");
  assert.equal(competeHref({ view: "event", id: "e1", results: true }), "#/compete/e/e1/results");
  for (const href of ["#/compete/p/abc/timing", "#/compete/e/e1/results", "#/compete/e/e1"]) assert.notDeepEqual(parseCompeteHash(href), { view: "hub" });
});

test("the season runs July to June", () => {
  assert.equal(seasonLabel("2026-10-17"), "2026–27");
  assert.equal(seasonLabel("2027-03-06"), "2026–27");
  assert.equal(seasonLabel("2026-07-01"), "2026–27");
  assert.equal(seasonLabel("2026-06-30"), "2025–26");
  assert.equal(seasonLabel("2099-12-31"), "2099–00");
  assert.equal(seasonLabel("nope"), "");
});

test("elements are numbered like a running order", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9, 14, 19, 40].map(roman), ["I", "II", "III", "IV", "V", "VI", "IX", "XIV", "XIX", "XL"]);
  assert.equal(roman(0), "");
  assert.equal(roman("x"), "");
});
