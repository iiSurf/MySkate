import test from "node:test";
import assert from "node:assert/strict";
import {
  fmtTime,
  fmtRange,
  isDay,
  isoWeekday,
  sanitizeRink,
  sanitizeIceSession,
  sanitizeIceView,
  occurrencesInWeek,
  filterOccurrences,
  pickClashes,
  upcomingPicks,
  slotFor,
  guessKind,
  parseIcs,
  buildIcs,
  nextRinkColor,
  dropEnded,
  applyImport,
  RINK_COLORS,
} from "../js/ice.js";
import { defaultState, sanitizeState, mergeStates, replaceState, exportJSON, parseBackup } from "../js/store.js";

/* 2026-10-12 is a Monday, so the week below runs Monday the 12th to Sunday the 18th. */
const WEEK = "2026-10-12";
const sess = (o) => sanitizeIceSession({ id: "s" + Math.random().toString(36).slice(2, 8), rinkId: "r1", kind: "freestyle", days: [1], start: "14:00", end: "15:00", ...o });

test("times read the way a skater would say them", () => {
  assert.equal(fmtTime("14:30"), "2:30 PM");
  assert.equal(fmtTime("00:00"), "12 AM");
  assert.equal(fmtTime("12:00"), "12 PM");
  assert.equal(fmtRange("14:30", "15:30"), "2:30–3:30 PM");
  assert.equal(fmtRange("11:30", "12:30"), "11:30 AM – 12:30 PM");
});

test("days are real days, and Monday is 1", () => {
  assert.equal(isDay("2026-10-12"), true);
  assert.equal(isDay("2026-02-31"), false);
  assert.equal(isDay("10/12/2026"), false);
  assert.equal(isoWeekday("2026-10-12"), 1);
  assert.equal(isoWeekday("2026-10-18"), 7);
});

test("a rink needs a name, and only web links survive", () => {
  assert.equal(sanitizeRink({ id: "r", name: "  " }), null);
  assert.equal(sanitizeRink({ name: "No id" }), null);
  assert.equal(sanitizeRink({ id: "r", name: "Highland", url: "javascript:alert(1)" }).url, "");
  assert.equal(sanitizeRink({ id: "r", name: "Highland", url: "https://example.com/ice" }).url, "https://example.com/ice");
  for (const bad of ["https://javascript:alert(1)", "https://localhost", "https://", "ftp://example.com", "https://exa mple.com", "example.com"]) assert.equal(sanitizeRink({ id: "r", name: "Highland", url: bad }).url, "", bad);
  assert.equal(sanitizeRink({ id: "r", name: "Highland", url: "https://example.com:8080/ice?x=1" }).url, "https://example.com:8080/ice?x=1");
  assert.equal(sanitizeRink({ id: "r", name: "Highland", color: "red" }).color, RINK_COLORS[0]);
  assert.equal(sanitizeRink({ id: "r", name: "x".repeat(500) }).name.length, 60);
});

test("sanitizeIceSession drops sessions that cannot mean anything and tidies the rest", () => {
  assert.equal(sanitizeIceSession(null), null);
  assert.equal(sess({ end: "14:00" }), null, "ends when it starts");
  assert.equal(sess({ end: "13:00" }), null, "ends before it starts");
  assert.equal(sess({ start: "25:00" }), null, "not a time");
  assert.equal(sess({ days: [] }), null, "no day and no date");
  assert.equal(sess({ rinkId: "" }), null);
  const s = sess({ days: [5, 2, 2, 9, "x", 0], kind: "nonsense", price: 99999, note: "n".repeat(900) });
  assert.deepEqual(s.days, [2, 5]);
  assert.equal(s.kind, "other");
  assert.equal(s.price, 999);
  assert.equal(s.note.length, 200);
  assert.equal(sess({ price: "free" }).price, null);
  const once = sess({ days: [1, 2], date: "2026-10-20" });
  assert.deepEqual(once.days, [], "a one-day session ignores weekdays");
  assert.equal(once.date, "2026-10-20");
  const swapped = sess({ from: "2026-12-01", to: "2026-11-01" });
  assert.deepEqual([swapped.from, swapped.to], [null, null], "dates in the wrong order are dropped");
});

test("the week lists each weekly session on its days, within its dates, and one-day sessions on their day", () => {
  const weekly = sess({ id: "w", days: [1, 3, 7] });
  const limited = sess({ id: "l", days: [1, 2, 3], from: "2026-10-14", to: "2026-10-15" });
  const once = sess({ id: "o", days: [], date: "2026-10-17" });
  const outside = sess({ id: "x", days: [], date: "2026-10-19" });
  const occ = occurrencesInWeek([weekly, limited, once, outside], WEEK);
  assert.deepEqual(
    occ.map((o) => o.key),
    ["w@2026-10-12", "w@2026-10-14", "l@2026-10-14", "o@2026-10-17", "w@2026-10-18"]
  );
  assert.deepEqual(occurrencesInWeek([weekly], "2026-10-19").map((o) => o.date), ["2026-10-19", "2026-10-21", "2026-10-25"]);
});

test("the week is sorted by day, then start time", () => {
  const late = sess({ id: "a", days: [1], start: "18:00", end: "19:00" });
  const early = sess({ id: "b", days: [1], start: "07:00", end: "08:00" });
  assert.deepEqual(occurrencesInWeek([late, early], WEEK).map((o) => o.sessionId), ["b", "a"]);
});

test("filters narrow by type and rink, and an empty filter means everything", () => {
  const a = sess({ id: "a", kind: "freestyle", rinkId: "r1", pick: true });
  const b = sess({ id: "b", kind: "public", rinkId: "r2" });
  const c = sess({ id: "c", kind: "public", rinkId: "r1", pick: true });
  const occ = occurrencesInWeek([a, b, c], WEEK);
  const ids = (view) => filterOccurrences(occ, view).map((o) => o.sessionId).sort();
  assert.deepEqual(ids({}), ["a", "b", "c"]);
  assert.deepEqual(ids({ kinds: ["public"] }), ["b", "c"]);
  assert.deepEqual(ids({ rinkIds: ["r1"] }), ["a", "c"]);
  assert.deepEqual(ids({ kinds: ["public"], rinkIds: ["r1"] }), ["c"]);
  assert.deepEqual(ids({ picksOnly: true }), ["a", "c"]);
  assert.deepEqual(ids({ picksOnly: true, kinds: ["freestyle"] }), ["a"]);
});

test("only picked sessions that really overlap are clashes", () => {
  const a = sess({ id: "a", start: "14:00", end: "15:00", pick: true });
  const b = sess({ id: "b", start: "14:30", end: "15:30", pick: true, rinkId: "r2" });
  const touching = sess({ id: "t", start: "15:30", end: "16:30", pick: true });
  const unpicked = sess({ id: "u", start: "14:15", end: "14:45" });
  const clashes = pickClashes(occurrencesInWeek([a, b, touching, unpicked], WEEK));
  assert.deepEqual([...clashes.keys()].sort(), ["a@2026-10-12", "b@2026-10-12"]);
  assert.equal(clashes.get("a@2026-10-12")[0].sessionId, "b");
});

test("upcoming picks start from now, keep a session that is on right now, and cross into next week", () => {
  const now = new Date(2026, 9, 17, 15, 0); // Saturday 3:00 PM
  const onNow = sess({ id: "now", days: [6], start: "14:00", end: "15:30", pick: true });
  const earlier = sess({ id: "early", days: [6], start: "10:00", end: "11:00", pick: true });
  const sunday = sess({ id: "sun", days: [7], start: "09:00", end: "10:00", pick: true });
  const monday = sess({ id: "mon", days: [1], start: "07:00", end: "08:00", pick: true });
  const notPicked = sess({ id: "np", days: [6], start: "16:00", end: "17:00" });
  const got = upcomingPicks([monday, sunday, earlier, onNow, notPicked], now, 3);
  assert.deepEqual(got.map((o) => `${o.sessionId}@${o.date}`), ["now@2026-10-17", "sun@2026-10-18", "mon@2026-10-19"]);
  assert.deepEqual(upcomingPicks([monday, sunday, earlier, onNow], now, 1).map((o) => o.sessionId), ["now"]);
  assert.deepEqual(upcomingPicks([notPicked], now), []);
  const finished = new Date(2026, 9, 17, 15, 45);
  assert.deepEqual(upcomingPicks([onNow, earlier], finished, 3).map((o) => o.date), ["2026-10-24", "2026-10-24"].slice(0, 2), "both repeat next Saturday");
});

test("a slot for a session is its length in steps of 5, kept between 5 and 300", () => {
  assert.equal(slotFor({ start: "14:00", end: "14:45" }), 45);
  assert.equal(slotFor({ start: "14:00", end: "15:02" }), 60);
  assert.equal(slotFor({ start: "06:00", end: "23:00" }), 300);
});

test("calendar titles are sorted into kinds", () => {
  assert.equal(guessKind("Freestyle Session 1"), "freestyle");
  assert.equal(guessKind("Free Skate"), "freestyle");
  assert.equal(guessKind("Stick & Puck"), "stick");
  assert.equal(guessKind("Learn to Skate Class"), "learn");
  assert.equal(guessKind("Adult Skate"), "adult");
  assert.equal(guessKind("Public Skating"), "public");
  assert.equal(guessKind("Open Skate (all ages)"), "public");
  assert.equal(guessKind("Zamboni maintenance"), "other");
});

const ics = (events) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
const ev = (lines) => ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");

test("a calendar file becomes sessions, and what MySkate cannot use is counted, not guessed", () => {
  const text = ics([
    ev(["DTSTART;TZID=America/Los_Angeles:20261020T143000", "DTEND;TZID=America/Los_Angeles:20261020T153000", "RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959", "SUMMARY:Freestyle\\, Ice 1"]),
    ev(["DTSTART:20261024T100000", "DURATION:PT1H30M", "SUMMARY:Public Skate"]),
    ev(["DTSTART;VALUE=DATE:20261025", "SUMMARY:Rink closed (all day)"]),
    ev(["DTSTART:20261026T220000", "DTEND:20261027T010000", "SUMMARY:Overnight camp"]),
    ev(["DTSTART:20261026T100000", "DTEND:20261026T110000", "RRULE:FREQ=MONTHLY", "SUMMARY:Monthly"]),
    ev(["DTSTART:20261026T100000", "DTEND:20261026T110000", "RRULE:FREQ=WEEKLY;INTERVAL=9", "SUMMARY:Every ninth week"]),
    ev(["DTSTART:20261026T100000", "DTEND:20261026T110000", "STATUS:CANCELLED", "SUMMARY:Cancelled"]),
    ev(["DTSTART:20250105T100000", "DTEND:20250105T110000", "SUMMARY:Long ago"]),
    ev(["DTSTART:20250105T100000", "DTEND:20250105T110000", "RRULE:FREQ=WEEKLY;UNTIL=20250301", "SUMMARY:Old weekly"]),
    ev(["DTSTART:20261024T100000", "DTEND:20261024T113000", "SUMMARY:Public Skate"]),
    ev(["SUMMARY:No start"]),
  ]);
  const got = parseIcs(text, { today: "2026-10-17" });
  assert.equal(got.total, 11);
  assert.equal(got.sessions.length, 2, "the weekly one and one Public Skate (its twin is the same session)");
  assert.equal(got.skipped, 6, "all day, overnight, monthly, every other week, cancelled, and no start");
  assert.equal(got.ended, 2);
  const [weekly, once] = got.sessions;
  assert.deepEqual([weekly.kind, weekly.days, weekly.start, weekly.end, weekly.from, weekly.to, weekly.note], ["freestyle", [2, 4], "14:30", "15:30", "2026-10-20", "2026-12-31", "Freestyle, Ice 1"]);
  assert.deepEqual([once.kind, once.date, once.start, once.end], ["public", "2026-10-24", "10:00", "11:30"]);
});

test("times ending in Z are read as UTC and shown as local time", () => {
  const utc = Date.UTC(2026, 9, 20, 22, 0);
  const local = new Date(utc);
  const got = parseIcs(ics([ev(["DTSTART:20261020T220000Z", "DTEND:20261020T230000Z", "SUMMARY:Freestyle"])]), { today: "2026-10-17" });
  assert.equal(got.sessions.length, 1);
  assert.equal(got.sessions[0].start, `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`);
  assert.equal(got.sessions[0].date, `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`);
});

test("a repeat with a count ends on its last day, and folded lines are joined", () => {
  const got = parseIcs(
    ics([ev(["DTSTART:20261020T100000", "DTEND:20261020T110000", "RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=4", "SUMMARY:Learn to skate class with a very long title that the calendar program wrapped onto", "  a second line"])]),
    { today: "2026-10-17" }
  );
  assert.deepEqual(got.sessions[0].days, [2, 4]);
  assert.equal(got.sessions[0].to, "2026-10-29", "Tue 20, Thu 22, Tue 27, Thu 29");
  assert.match(got.sessions[0].note, /onto a second line$/);
  assert.equal(got.sessions[0].kind, "learn");
});

test("nonsense in, nothing out", () => {
  for (const junk of ["", "hello", "BEGIN:VEVENT", "BEGIN:VEVENT\nDTSTART:soon\nEND:VEVENT", "\u0000\u0001"]) {
    const got = parseIcs(junk, { today: "2026-10-17" });
    assert.equal(got.sessions.length, 0);
  }
});

test("a calendar export reads back the same sessions, with special characters and short lines", () => {
  const rinks = [{ id: "r1", name: "Highland, Ice; Arena", city: "Shoreline", url: "https://example.com/ice", color: RINK_COLORS[0] }];
  const a = sess({ id: "a", days: [2, 4], from: "2026-10-20", to: "2026-12-31", note: "Freestyle 1, with a note; and\na new line " + "very long ".repeat(12), price: 18, pick: true });
  const b = sess({ id: "b", days: [], date: "2026-10-24", kind: "public", start: "10:00", end: "11:30" });
  const file = buildIcs([a, b], rinks, { now: new Date(Date.UTC(2026, 9, 17, 12, 0)) });
  assert.ok(file.startsWith("BEGIN:VCALENDAR\r\n") && file.endsWith("END:VCALENDAR\r\n"));
  for (const line of file.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, `line too long: ${line}`);
  assert.match(file, /RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959/);
  assert.ok(file.includes("SUMMARY:Freestyle at Highland\\, Ice\\; Arena"), "commas and semicolons are escaped");
  const back = parseIcs(file, { today: "2026-10-17" });
  assert.equal(back.sessions.length, 2);
  const [x, y] = back.sessions;
  assert.deepEqual([x.days, x.start, x.end, x.from, x.to, x.kind], [[2, 4], "14:00", "15:00", "2026-10-20", "2026-12-31", "freestyle"]);
  assert.deepEqual([y.date, y.start, y.end, y.kind], ["2026-10-24", "10:00", "11:30", "public"]);
});

test("rink colors rotate through the palette", () => {
  assert.equal(nextRinkColor([]), RINK_COLORS[0]);
  assert.equal(nextRinkColor([{ color: RINK_COLORS[0] }]), RINK_COLORS[1]);
  assert.equal(nextRinkColor(RINK_COLORS.map((color) => ({ color }))), RINK_COLORS[0]);
});

test("the ice view keeps only real kinds and drops repeats", () => {
  const v = sanitizeIceView({ kinds: ["freestyle", "freestyle", "nope"], rinkIds: ["a", "a", "", 5], picksOnly: "yes" });
  assert.deepEqual(v, { kinds: ["freestyle"], rinkIds: ["a"], picksOnly: false });
  assert.deepEqual(sanitizeIceView(null), { kinds: [], rinkIds: [], picksOnly: false });
});

/* ---------- Saved data ---------- */

const withIce = () => {
  const s = defaultState();
  s.rinks = [{ id: "r1", name: "Highland", city: "Shoreline", url: "", color: RINK_COLORS[0] }];
  s.iceSessions = [sess({ id: "a", rinkId: "r1", pick: true })];
  s.iceView = { kinds: ["freestyle"], rinkIds: ["r1"], picksOnly: true };
  return s;
};

test("a new state has no rinks, and an old backup without them loads", () => {
  const s = defaultState();
  assert.deepEqual([s.rinks, s.iceSessions, s.iceView], [[], [], { kinds: [], rinkIds: [], picksOnly: false }]);
  const old = JSON.parse(exportJSON(defaultState()));
  delete old.rinks;
  delete old.iceSessions;
  delete old.iceView;
  const parsed = parseBackup(JSON.stringify(old));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.state.rinks, []);
});

test("saved rinks and sessions survive a backup, and sessions without a rink are dropped", () => {
  const state = withIce();
  state.iceSessions.push({ ...state.iceSessions[0], id: "orphan", rinkId: "gone" });
  const parsed = parseBackup(exportJSON(state));
  assert.deepEqual(parsed.state.rinks.map((r) => r.name), ["Highland"]);
  assert.deepEqual(parsed.state.iceSessions.map((s) => s.id), ["a"]);
  assert.deepEqual(parsed.state.iceView, { kinds: ["freestyle"], rinkIds: ["r1"], picksOnly: true });
  const dirty = sanitizeState({ rinks: [{ id: "r1", name: "A" }, { id: "r1", name: "Repeat" }, "junk"], iceSessions: [{ id: "a", rinkId: "r1", days: [1], start: "10:00", end: "11:00" }, { id: "a", rinkId: "r1", days: [2], start: "10:00", end: "11:00" }], iceView: { rinkIds: ["r1", "zzz"] } });
  assert.equal(dirty.rinks.length, 1);
  assert.equal(dirty.iceSessions.length, 1);
  assert.deepEqual(dirty.iceView.rinkIds, ["r1"]);
});

test("merging adds the rinks and sessions you are missing and keeps yours", () => {
  const current = withIce();
  const incoming = withIce();
  incoming.rinks[0].name = "Highland (their copy)";
  incoming.rinks.push({ id: "r2", name: "Sno-King", city: "Kirkland", url: "", color: RINK_COLORS[1] });
  incoming.iceSessions.push(sess({ id: "b", rinkId: "r2" }));
  incoming.iceView = { kinds: [], rinkIds: [], picksOnly: false };
  const { state } = mergeStates(current, incoming);
  assert.deepEqual(state.rinks.map((r) => r.name), ["Highland", "Sno-King"]);
  assert.deepEqual(state.iceSessions.map((s) => s.id), ["a", "b"]);
  assert.equal(state.iceView.picksOnly, true, "your view stays");
  assert.deepEqual(replaceState(incoming, current).rinks.map((r) => r.id), ["r1", "r2"]);
});

test("MySkate's own calendar titles come back without the 'at the rink' part", () => {
  const got = parseIcs(ics([ev(["DTSTART:20261024T100000", "DTEND:20261024T113000", "SUMMARY:Public skate at Highland\\, Ice Arena"]), ev(["DTSTART:20261025T100000", "DTEND:20261025T113000", "SUMMARY:Open Skate Saturday"])]), { today: "2026-10-17" });
  assert.deepEqual(got.sessions.map((s) => [s.kind, s.note]), [["public", ""], ["public", "Open Skate Saturday"]]);
});


test("a calendar can skip dates and move or cancel single sessions, the way Google Calendar writes a holiday closure", () => {
  const file = ics([
    ev(["UID:a1@x", "DTSTART;TZID=America/Los_Angeles:20261020T143000", "DTEND;TZID=America/Los_Angeles:20261020T153000", "RRULE:FREQ=WEEKLY;BYDAY=TU,TH", "EXDATE;TZID=America/Los_Angeles:20261105T143000,20261110T143000", "EXDATE;TZID=America/Los_Angeles:20260101T143000", "SUMMARY:Freestyle"]),
    ev(["UID:a1@x", "RECURRENCE-ID;TZID=America/Los_Angeles:20261022T143000", "DTSTART;TZID=America/Los_Angeles:20261022T160000", "DTEND;TZID=America/Los_Angeles:20261022T170000", "SUMMARY:Freestyle (moved)"]),
    ev(["UID:a1@x", "RECURRENCE-ID;TZID=America/Los_Angeles:20261027T143000", "DTSTART;TZID=America/Los_Angeles:20261027T143000", "DTEND;TZID=America/Los_Angeles:20261027T153000", "STATUS:CANCELLED", "SUMMARY:Freestyle"]),
  ]);
  const got = parseIcs(file, { today: "2026-10-17" });
  assert.equal(got.skipped, 0, "a cancelled single date is not 'left out', it is handled");
  assert.equal(got.sessions.length, 2);
  const [weekly, moved] = got.sessions;
  assert.deepEqual(weekly.skip, ["2026-10-22", "2026-10-27", "2026-11-05", "2026-11-10"], "past dates are not kept");
  assert.deepEqual([moved.date, moved.start, moved.end, moved.note], ["2026-10-22", "16:00", "17:00", "Freestyle (moved)"]);
  const s = sanitizeIceSession({ id: "w", rinkId: "r1", ...weekly });
  const dates = (week) => occurrencesInWeek([s], week).map((o) => o.date);
  assert.deepEqual(dates("2026-10-19"), ["2026-10-20"], "Thursday the 22nd moved away");
  assert.deepEqual(dates("2026-10-26"), ["2026-10-29"], "Tuesday the 27th is cancelled");
  assert.deepEqual(dates("2026-11-02"), ["2026-11-03"], "Tuesday Nov 3 runs, Thursday Nov 5 is skipped");
});

test("every other week counts from the first day", () => {
  const got = parseIcs(ics([ev(["DTSTART:20261020T100000", "DTEND:20261020T110000", "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU", "SUMMARY:Learn to skate"])]), { today: "2026-10-17" });
  assert.equal(got.sessions[0].every, 2);
  const s = sanitizeIceSession({ id: "e", rinkId: "r1", ...got.sessions[0] });
  assert.deepEqual([s.every, s.from], [2, "2026-10-20"]);
  const weeks = ["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"];
  assert.deepEqual(weeks.map((w) => occurrencesInWeek([s], w).length), [1, 0, 1, 0, 1]);
  assert.equal(sanitizeIceSession({ id: "e", rinkId: "r1", days: [2], every: 2, start: "10:00", end: "11:00" }).every, 1, "no first day to count from");
  assert.equal(sanitizeIceSession({ id: "e", rinkId: "r1", days: [2], from: "2026-10-20", every: 9, start: "10:00", end: "11:00" }).every, 1);
});

test("Z times are turned into the calendar's own time zone, not the device's", () => {
  const file = ics([ev(["DTSTART:20261020T210000Z", "DTEND:20261020T220000Z", "SUMMARY:Public Skate"])]).replace("VERSION:2.0", "VERSION:2.0\r\nX-WR-TIMEZONE:America/Los_Angeles");
  const got = parseIcs(file, { today: "2026-10-17" });
  assert.deepEqual([got.sessions[0].date, got.sessions[0].start, got.sessions[0].end], ["2026-10-20", "14:00", "15:00"], "9 PM UTC is 2 PM in Los Angeles in October");
  const winter = parseIcs(file.replaceAll("20261020", "20261120"), { today: "2026-10-17" });
  assert.equal(winter.sessions[0].start, "13:00", "after the clocks go back it is 1 PM");
  const odd = parseIcs(ics([ev(["DTSTART:20261020T210000Z", "DTEND:20261020T220000Z", "SUMMARY:x"])]).replace("VERSION:2.0", "VERSION:2.0\r\nX-WR-TIMEZONE:Mars/Olympus"), { today: "2026-10-17" });
  assert.equal(odd.sessions.length, 1, "an unknown zone name falls back to the device clock instead of failing");
});

test("reminders inside an event are not read as the event", () => {
  const got = parseIcs(ics([ev(["DTSTART:20261024T100000", "DTEND:20261024T113000", "SUMMARY:Public Skate", "BEGIN:VALARM", "ACTION:EMAIL", "SUMMARY:Freestyle reminder", "TRIGGER:-PT15M", "END:VALARM"])]), { today: "2026-10-17" });
  assert.deepEqual(got.sessions.map((s) => s.kind), ["public"]);
});

test("a calendar export keeps skipped dates and every-other-week", () => {
  const rinks = [{ id: "r1", name: "Highland", city: "", url: "", color: RINK_COLORS[0] }];
  const a = sess({ id: "a", days: [2], from: "2026-10-20", every: 2, skip: ["2026-11-03", "2026-12-01"], pick: true });
  const file = buildIcs([a], rinks, { now: new Date(Date.UTC(2026, 9, 17, 12, 0)) });
  assert.match(file, /RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU/);
  assert.equal((file.match(/EXDATE:/g) || []).length, 2);
  const back = parseIcs(file, { today: "2026-10-17" }).sessions[0];
  assert.deepEqual([back.every, back.skip], [2, ["2026-11-03", "2026-12-01"]]);
});

test("only the present and the future are kept", () => {
  const list = [
    sess({ id: "past-day", days: [], date: "2026-10-16" }),
    sess({ id: "today", days: [], date: "2026-10-17" }),
    sess({ id: "ended", days: [1], to: "2026-10-16" }),
    sess({ id: "last-day", days: [1], to: "2026-10-17" }),
    sess({ id: "forever", days: [1] }),
    sess({ id: "later", days: [1], from: "2027-01-01" }),
  ];
  assert.deepEqual(dropEnded(list, "2026-10-17").map((s) => s.id), ["today", "last-day", "forever", "later"]);
});

const found = (o) => ({ kind: "freestyle", days: [2], date: null, start: "14:00", end: "15:00", price: null, note: "", from: "2026-10-20", to: null, skip: [], every: 1, pick: false, ...o });
let n = 0;
const makeId = () => "n" + ++n;

test("importing a newer file updates what you imported before, keeping stars and prices, and leaves your own sessions alone", () => {
  const tue = sess({ id: "old-tue", days: [2], imported: true, pick: true, price: 18, from: "2026-10-20" });
  const thu = sess({ id: "old-thu", days: [4], imported: true, from: "2026-10-20" });
  const gone = sess({ id: "old-sat", days: [6], imported: true, start: "09:00", end: "10:00" });
  const mine = sess({ id: "mine", days: [1], kind: "public", start: "19:00", end: "20:00" });
  const other = sess({ id: "other-rink", rinkId: "r2", days: [2], imported: true });
  const file = [found({ days: [2] }), found({ days: [4] }), found({ days: [5], kind: "public", start: "19:00", end: "20:00" }), found({ days: [1], kind: "public", start: "19:00", end: "20:00" })];
  const got = applyImport([tue, thu, gone, mine, other], file, { rinkId: "r1", replace: true, makeId });
  assert.deepEqual([got.added, got.removed, got.unchanged, got.dropped], [1, 1, 2, 0], "Friday is new; Saturday is gone; Tue and Thu are the same; Monday public is one you already added by hand");
  const ids = got.sessions.map((s) => s.id);
  assert.ok(ids.includes("mine") && ids.includes("other-rink"));
  assert.ok(!ids.includes("old-sat") && !ids.includes("old-tue"));
  const newTue = got.sessions.find((s) => s.rinkId === "r1" && s.days[0] === 2);
  assert.deepEqual([newTue.pick, newTue.price, newTue.imported], [true, 18, true]);
  assert.equal(got.sessions.filter((s) => s.rinkId === "r1" && s.days[0] === 1).length, 1, "no copy of the one added by hand");
});

test("importing without replacing only adds what is new", () => {
  const have = sess({ id: "have", days: [2], imported: true });
  const got = applyImport([have], [found({ days: [2] }), found({ days: [3] })], { rinkId: "r1", replace: false, pickAll: true, makeId });
  assert.deepEqual([got.added, got.removed, got.unchanged], [1, 0, 0]);
  assert.equal(got.sessions.length, 2);
  assert.equal(got.sessions.find((s) => s.days[0] === 3).pick, true);
  assert.equal(got.sessions.find((s) => s.id === "have").pick, false);
});

test("an import stops at the session limit and says how many did not fit", () => {
  const many = Array.from({ length: 499 }, (_, i) => sess({ id: "k" + i, days: [], date: `2027-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`, start: `${String(i % 24).padStart(2, "0")}:00`, end: `${String(i % 24).padStart(2, "0")}:30` }));
  const got = applyImport(many, [found({ days: [1] }), found({ days: [2] }), found({ days: [3] })], { rinkId: "r1", replace: false, makeId });
  assert.equal(got.sessions.length, 500);
  assert.equal(got.dropped, 2);
});

test("skipped dates are cleaned: real days only, kept in order, and a one-day session has none", () => {
  const s = sess({ days: [2], skip: ["2026-11-05", "nope", "2026-02-31", "2026-10-30", "2026-11-05"] });
  assert.deepEqual(s.skip, ["2026-10-30", "2026-11-05"]);
  assert.deepEqual(sess({ days: [], date: "2026-11-05", skip: ["2026-11-05"] }).skip, []);
  assert.equal(sess({ imported: "yes" }).imported, false);
});
