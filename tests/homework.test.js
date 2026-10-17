import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHomework, sanitizeHomeworkList, addHomework, toggleHomework, sortedHomework, clearDone, homeworkDoneDates, MAX_HOMEWORK, MAX_TEXT } from "../js/homework.js";
import { defaultState, sanitizeState, parseBackup, exportJSON, mergeStates, replaceState } from "../js/store.js";

const hw = (o = {}) => sanitizeHomework({ id: "h1", text: "Eyes up on the waltz jump", skillId: "waltz", due: "", created: "2026-10-01", ...o });

test("homework is cleaned: it needs an id and words, the words are trimmed and limited, the day is real", () => {
  assert.deepEqual(hw(), { id: "h1", text: "Eyes up on the waltz jump", skillId: "waltz", due: "", done: false, doneOn: "", created: "2026-10-01" });
  assert.equal(sanitizeHomework({ text: "no id" }), null);
  assert.equal(sanitizeHomework({ id: "x", text: "   " }), null);
  assert.equal(sanitizeHomework({ id: "x" }), null);
  assert.equal(sanitizeHomework(null), null);
  assert.equal(hw({ text: "x".repeat(900) }).text.length, MAX_TEXT);
  assert.equal(hw({ text: "bend\u0007 knees" }).text, "bend  knees", "control characters become spaces");
  assert.equal(hw({ due: "2026-02-31" }).due, "");
  assert.equal(hw({ due: "2026-11-02" }).due, "2026-11-02");
  assert.equal(hw({ skillId: 12 }).skillId, "");
  const done = hw({ done: true, doneOn: "2026-10-09" });
  assert.deepEqual([done.done, done.doneOn], [true, "2026-10-09"]);
  assert.equal(hw({ done: false, doneOn: "2026-10-09" }).doneOn, "", "a day without a tick is dropped");
  assert.equal(hw({ done: "yes" }).done, false);
});

test("a list has no repeated ids and a limit", () => {
  const many = Array.from({ length: 120 }, (_, i) => ({ id: "h" + i, text: "t" + i }));
  assert.equal(sanitizeHomeworkList(many).length, MAX_HOMEWORK);
  assert.deepEqual(sanitizeHomeworkList([{ id: "a", text: "one" }, { id: "a", text: "two" }, null, 3]).map((h) => h.text), ["one"]);
  assert.deepEqual(sanitizeHomeworkList("nope"), []);
});

test("adding homework", () => {
  const first = addHomework([], { text: "  Stretch before every session  ", skillId: "", due: "2026-10-29" }, "h1", "2026-10-17");
  assert.deepEqual([first.status, first.list[0].text, first.list[0].due, first.list[0].created], ["added", "Stretch before every session", "2026-10-29", "2026-10-17"]);
  assert.equal(addHomework([], { text: "   " }, "h", "2026-10-17").status, "invalid");
  const full = Array.from({ length: MAX_HOMEWORK }, (_, i) => hw({ id: "h" + i }));
  assert.equal(addHomework(full, { text: "one more" }, "new", "2026-10-17").status, "full");
  assert.equal(first.list.length, 1);
});

test("ticking one off remembers the day, and un-ticking takes it back", () => {
  const list = [hw({ id: "a" }), hw({ id: "b" })];
  const ticked = toggleHomework(list, "a", "2026-10-17");
  assert.deepEqual([ticked[0].done, ticked[0].doneOn, ticked[1].done], [true, "2026-10-17", false]);
  assert.equal(list[0].done, false, "the old list is not changed");
  const back = toggleHomework(ticked, "a", "2026-10-18");
  assert.deepEqual([back[0].done, back[0].doneOn], [false, ""]);
  assert.deepEqual(toggleHomework(list, "zzz", "2026-10-17"), list);
});

test("open homework comes first (soonest due, undated after, oldest first), then done ones, newest first; overdue is worked out", () => {
  const list = [
    hw({ id: "late", text: "late", due: "2026-12-01", created: "2026-10-01" }),
    hw({ id: "soon", text: "soon", due: "2026-10-20", created: "2026-10-05" }),
    hw({ id: "none-new", text: "none new", created: "2026-10-12" }),
    hw({ id: "none-old", text: "none old", created: "2026-10-02" }),
    hw({ id: "d1", text: "d1", done: true, doneOn: "2026-10-09" }),
    hw({ id: "d2", text: "d2", done: true, doneOn: "2026-10-15", due: "2026-10-01" }),
    hw({ id: "over", text: "over", due: "2026-10-10" }),
  ];
  const rows = sortedHomework(list, "2026-10-17");
  assert.deepEqual(rows.map((h) => h.id), ["over", "soon", "late", "none-old", "none-new", "d2", "d1"]);
  assert.deepEqual([rows[0].overdue, rows[0].countdown.label, rows[1].overdue, rows[1].countdown.label], [true, "Passed", false, "D-3"]);
  assert.equal(rows.find((h) => h.id === "d2").overdue, false, "finished homework is never overdue");
  assert.equal(rows.find((h) => h.id === "none-old").countdown, null);
});

test("clearing done homework keeps the open ones, and the done days are kept for badges", () => {
  const list = [hw({ id: "a" }), hw({ id: "b", done: true, doneOn: "2026-10-15" }), hw({ id: "c", done: true, doneOn: "2026-10-09" })];
  assert.deepEqual(clearDone(list).map((h) => h.id), ["a"]);
  assert.deepEqual(homeworkDoneDates(list), ["2026-10-09", "2026-10-15"]);
  assert.deepEqual(homeworkDoneDates([]), []);
});

test("homework is saved with your data, cleaned, merged by id, and old backups load", () => {
  const state = defaultState();
  state.homework = [hw({ id: "a", due: "2026-10-29" }), hw({ id: "b", done: true, doneOn: "2026-10-09" })];
  assert.deepEqual(parseBackup(exportJSON(state)).state.homework, state.homework);
  assert.deepEqual(sanitizeState({ homework: [{ id: "a", text: "ok" }, { id: "b", text: "" }, "junk"] }).homework.map((h) => h.id), ["a"]);
  const old = JSON.parse(exportJSON(state));
  delete old.homework;
  assert.deepEqual(parseBackup(JSON.stringify(old)).state.homework, []);
  const mine = defaultState();
  mine.homework = [hw({ id: "a", text: "mine", done: true, doneOn: "2026-10-12" })];
  const theirs = defaultState();
  theirs.homework = [hw({ id: "a", text: "theirs" }), hw({ id: "b", text: "new one" })];
  assert.deepEqual(mergeStates(mine, theirs).state.homework.map((h) => [h.id, h.text, h.done]), [["a", "mine", true], ["b", "new one", false]]);
  assert.deepEqual(replaceState({ ...theirs, profile: { ...theirs.profile, onboarded: true } }, mine).homework.map((h) => h.id), ["a", "b"]);
});
