/* Coach homework: things your coach asked you to work on, each with a note, an optional skill, and an optional due day.
   Tick them off as you go. Pure logic, no page code. */

import { isDay } from "./ice.js";
import { countdown } from "./testprep.js";
import { todayISO } from "./util.js";

export const MAX_HOMEWORK = 60;
export const MAX_TEXT = 200;

/* One piece of homework, cleaned. Returns null when it has no id or no words. */
export function sanitizeHomework(h) {
  if (!h || typeof h !== "object") return null;
  const id = typeof h.id === "string" ? h.id.trim().slice(0, 80) : "";
  const text = typeof h.text === "string" ? h.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, MAX_TEXT) : "";
  if (!id || !text) return null;
  const done = h.done === true;
  return {
    id,
    text,
    skillId: typeof h.skillId === "string" ? h.skillId.trim().slice(0, 120) : "",
    due: isDay(h.due) ? h.due : "",
    done,
    doneOn: done && isDay(h.doneOn) ? h.doneOn : "",
    created: isDay(h.created) ? h.created : todayISO(),
  };
}

export function sanitizeHomeworkList(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map(sanitizeHomework)
    .filter((h) => h && !seen.has(h.id) && seen.add(h.id))
    .slice(0, MAX_HOMEWORK);
}

/* Add a piece of homework. status: "added", "invalid" (no words), or "full". Returns a new list. */
export function addHomework(list, { text, skillId = "", due = "" }, id, today = todayISO()) {
  const h = sanitizeHomework({ id, text, skillId, due, created: today });
  if (!h) return { list, status: "invalid" };
  if (list.length >= MAX_HOMEWORK) return { list, status: "full" };
  return { list: [...list, h], status: "added" };
}

/* Tick one off, or take the tick back. Done ones remember the day. Returns a new list. */
export function toggleHomework(list, id, today = todayISO()) {
  return list.map((h) => (h.id === id ? { ...h, done: !h.done, doneOn: h.done ? "" : today } : h));
}

/* Open homework first (due soonest, then the ones with no date, oldest first), then done ones (most recently finished first).
   Each has countdown and overdue worked out for today. */
export function sortedHomework(list, today = todayISO()) {
  const rows = list.map((h) => {
    const cd = h.due ? countdown(h.due, today) : null;
    return { ...h, countdown: cd, overdue: !h.done && Boolean(cd) && cd.days < 0 };
  });
  const open = rows.filter((h) => !h.done).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
  const done = rows.filter((h) => h.done).sort((a, b) => b.doneOn.localeCompare(a.doneOn) || a.id.localeCompare(b.id));
  return [...open, ...done];
}

export const clearDone = (list) => list.filter((h) => !h.done);

/* The day each finished piece of homework was finished, for badges. */
export const homeworkDoneDates = (list) => list.filter((h) => h.done && h.doneOn).map((h) => h.doneOn).sort();
