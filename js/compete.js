/* The competition planner's logic. An event is a competition and its day. A program is the music, the elements, where each element
   goes on the rink, and when it happens in the music. A result is how it went. Nothing here knows an event's rules: the length,
   the elements, and the times are whatever the skater enters. Pure logic, no page code. */

import { daysBetween, todayISO } from "./util.js";
import { isDay, isTime, toMin, fromMin } from "./ice.js";

export const LIMITS = { events: 40, programs: 40, elements: 40, moments: 20, day: 30, bring: 30, marks: 60, name: 60, text: 80, note: 600, lengthMin: 20, lengthMax: 600 };

export const KINDS = [
  { id: "free", name: "Free skate" },
  { id: "short", name: "Short" },
  { id: "showcase", name: "Showcase" },
  { id: "exhibition", name: "Exhibition" },
  { id: "other", name: "Other" },
];
export const ELEMENT_TYPES = [
  { id: "jump", name: "Jump" },
  { id: "spin", name: "Spin" },
  { id: "steps", name: "Steps" },
  { id: "move", name: "Move" },
  { id: "pose", name: "Pose" },
];
export const MARKS = [
  { id: "clean", name: "Clean" },
  { id: "shaky", name: "Shaky" },
  { id: "fell", name: "Fell" },
  { id: "skipped", name: "Skipped" },
];
const KIND_IDS = KINDS.map((k) => k.id);
const TYPE_IDS = ELEMENT_TYPES.map((t) => t.id);
const MARK_IDS = MARKS.map((m) => m.id);
export const kindName = (id) => (KINDS.find((k) => k.id === id) || KINDS[KINDS.length - 1]).name;
export const typeName = (id) => (ELEMENT_TYPES.find((t) => t.id === id) || ELEMENT_TYPES[3]).name;
export const markName = (id) => (MARKS.find((m) => m.id === id) || { name: "" }).name;

export const DEFAULT_LENGTH = 90;
export const DEFAULT_BRING = ["Skates, sharpened", "Music on two devices", "Costume", "Water and a snack"];

/* ---- cleaning ---- */

const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
/* A note keeps its line breaks (never more than one blank line in a row) and tidies the spaces. */
const cleanNote = (v, max) =>
  typeof v === "string"
    ? v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max)
    : "";
/* An id for an event, program, element, and so on, kept to letters, digits, "_" and "-" so it can sit in a web address (anything else
   becomes "_"). The ids MySkate makes already fit; this is for a backup from somewhere else. */
const id = (v) => (typeof v === "string" ? v.trim().replace(/[^\w-]/g, "_").slice(0, 80) : "");
/* A skill's id comes from the catalog and has dots in it, so it is only trimmed. */
const skillKey = (v) => (typeof v === "string" ? v.trim().slice(0, 120) : "");
const int = (v, lo, hi, fallback) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const unit = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, Math.round(v * 1000) / 1000)) : null);
const once = (list, cleaner, limit) => {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map(cleaner).filter((x) => x && !seen.has(x.id) && seen.add(x.id)).slice(0, limit);
};

export function sanitizeElement(e) {
  if (!e || typeof e !== "object") return null;
  const eid = id(e.id);
  const label = clean(e.label, LIMITS.name);
  if (!eid || !label) return null;
  const x = unit(e.x);
  const y = unit(e.y);
  const placed = x !== null && y !== null;
  const at = typeof e.at === "number" && Number.isFinite(e.at) ? int(e.at, 0, LIMITS.lengthMax, null) : null;
  return {
    id: eid,
    label,
    type: TYPE_IDS.includes(e.type) ? e.type : "move",
    skillId: skillKey(e.skillId),
    x: placed ? x : null,
    y: placed ? y : null,
    at,
    dur: int(e.dur, 0, LIMITS.lengthMax, 0),
  };
}

export function sanitizeMoment(m) {
  if (!m || typeof m !== "object") return null;
  const mid = id(m.id);
  const text = clean(m.text, LIMITS.text);
  if (!mid || !text) return null;
  return { id: mid, at: int(m.at, 0, LIMITS.lengthMax, 0), text };
}

export function sanitizeProgram(p) {
  if (!p || typeof p !== "object") return null;
  const pid = id(p.id);
  if (!pid) return null;
  const lengthSec = int(p.lengthSec, LIMITS.lengthMin, LIMITS.lengthMax, DEFAULT_LENGTH);
  const music = p.music && typeof p.music === "object" ? p.music : {};
  /* Times stay inside the music: an element cannot start after the end, or run past it. */
  const elements = once(p.elements, sanitizeElement, LIMITS.elements).map((e) => {
    if (e.at === null) return { ...e, dur: Math.min(e.dur, lengthSec) };
    const at = Math.min(e.at, lengthSec);
    return { ...e, at, dur: Math.min(e.dur, lengthSec - at) };
  });
  const moments = once(p.moments, sanitizeMoment, LIMITS.moments)
    .map((m) => ({ ...m, at: Math.min(m.at, lengthSec) }))
    .sort((a, b) => a.at - b.at);
  return {
    id: pid,
    name: clean(p.name, LIMITS.name) || "My program",
    music: { title: clean(music.title, LIMITS.text), artist: clean(music.artist, LIMITS.text) },
    lengthSec,
    kind: KIND_IDS.includes(p.kind) ? p.kind : "free",
    eventId: id(p.eventId),
    note: cleanNote(p.note, LIMITS.note),
    elements,
    moments,
    created: isDay(p.created) ? p.created : "",
  };
}

export function sanitizeDayItem(d) {
  if (!d || typeof d !== "object") return null;
  const did = id(d.id);
  const label = clean(d.label, LIMITS.name);
  if (!did || !label || !isTime(d.time)) return null;
  return { id: did, label, time: d.time, mins: int(d.mins, 0, 600, 0), mine: d.mine === true };
}

export function sanitizeBringItem(b) {
  if (!b || typeof b !== "object") return null;
  const bid = id(b.id);
  const text = clean(b.text, LIMITS.text);
  if (!bid || !text) return null;
  return { id: bid, text, done: b.done === true };
}

export function sanitizeResult(r) {
  if (!r || typeof r !== "object") return null;
  let placing = int(r.placing, 1, 999, null);
  let of = int(r.of, 1, 999, null);
  if (placing !== null && of !== null && placing > of) of = null;
  if (placing === null) of = null;
  const marks = {};
  if (r.marks && typeof r.marks === "object") {
    for (const [k, v] of Object.entries(r.marks).slice(0, LIMITS.marks)) if (MARK_IDS.includes(v) && id(k)) marks[id(k)] = v;
  }
  return { programId: id(r.programId), placing, of, marks, note: cleanNote(r.note, LIMITS.note), coach: cleanNote(r.coach, LIMITS.note), recordedOn: isDay(r.recordedOn) ? r.recordedOn : "" };
}

export function sanitizeEvent(e) {
  if (!e || typeof e !== "object") return null;
  const eid = id(e.id);
  if (!eid || !isDay(e.date)) return null;
  return {
    id: eid,
    name: clean(e.name, LIMITS.name) || "Competition",
    date: e.date,
    place: clean(e.place, LIMITS.name),
    note: cleanNote(e.note, LIMITS.note),
    day: once(e.day, sanitizeDayItem, LIMITS.day),
    bring: once(e.bring, sanitizeBringItem, LIMITS.bring),
    result: sanitizeResult(e.result),
  };
}

export const sanitizeEvents = (list) => once(list, sanitizeEvent, LIMITS.events);

/* Programs and events together: a program only points at an event that exists, and a result only at a program that exists. */
export function cleanCompete(rawEvents, rawPrograms) {
  const events = sanitizeEvents(rawEvents);
  const programs = once(rawPrograms, sanitizeProgram, LIMITS.programs);
  const eventIds = new Set(events.map((e) => e.id));
  const programIds = new Set(programs.map((p) => p.id));
  return {
    events: events.map((e) => (e.result && e.result.programId && !programIds.has(e.result.programId) ? { ...e, result: { ...e.result, programId: "" } } : e)),
    programs: programs.map((p) => (p.eventId && !eventIds.has(p.eventId) ? { ...p, eventId: "" } : p)),
  };
}

/* ---- times ---- */

const pad = (n) => String(n).padStart(2, "0");

/* 90 seconds as "1:30". */
export function fmtMmSs(sec) {
  const total = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/* "1:30" or "90" as seconds, or null when it is neither. */
export function parseMmSs(text) {
  const t = String(text ?? "").trim();
  let m = /^(\d{1,2}):([0-5]\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^\d{1,4}$/.exec(t);
  return m ? Number(t) : null;
}

export const daysUntil = (date, today = todayISO()) => daysBetween(today, date);

export function countdownText(days) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `${days} days`;
  if (days === -1) return "Yesterday";
  return `${-days} days ago`;
}

export const upcomingEvents = (events, today = todayISO()) => events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
export const pastEvents = (events, today = todayISO()) => events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
export const nextEvent = (events, today = todayISO()) => upcomingEvents(events, today)[0] || null;

/* The skating season runs July to June: any day from July 1 is in that year's season, so October 17, 2026 is "2026–27" and March 6, 2027 is too. */
export function seasonLabel(date) {
  const y = Number(String(date).slice(0, 4));
  const m = Number(String(date).slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return "";
  const start = m >= 7 ? y : y - 1;
  return `${start}–${String((start + 1) % 100).padStart(2, "0")}`;
}

/* 4 as "IV", 14 as "XIV". Programs are listed like a running order. */
export function roman(n) {
  let v = Math.max(0, Math.min(3999, Math.round(Number(n) || 0)));
  let out = "";
  for (const [value, glyph] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) {
    while (v >= value) {
      out += glyph;
      v -= value;
    }
  }
  return out;
}

/* 1 to "1st", 22 to "22nd", 13 to "13th". */
export function ordinal(n) {
  const v = Math.abs(Math.round(n));
  const tail = v % 100;
  if (tail >= 11 && tail <= 13) return `${v}th`;
  return `${v}${{ 1: "st", 2: "nd", 3: "rd" }[v % 10] || "th"}`;
}

/* "2" or "2nd" as 2; anything else is nothing. */
export function parseWhole(text) {
  const m = /^\s*(\d{1,3})\s*(?:st|nd|rd|th)?\s*$/i.exec(String(text ?? ""));
  return m ? Number(m[1]) : null;
}

/* The form for a result, checked before it is saved: a placing that is a number from 1, a field size that is at least the placing,
   and something worth keeping. Returns { ok: true, result } or { ok: false, error }. */
export function checkResultDraft(draft, today = todayISO()) {
  const placingText = String(draft.placing ?? "").trim();
  const ofText = String(draft.of ?? "").trim();
  const placing = placingText ? parseWhole(placingText) : null;
  const of = ofText ? parseWhole(ofText) : null;
  if (placingText && (placing === null || placing < 1)) return { ok: false, error: "Enter your placing as a number, like 2." };
  if (ofText && (of === null || of < 1)) return { ok: false, error: "Enter how many skaters as a number, like 9." };
  if (ofText && !placingText) return { ok: false, error: "Add your placing too, or clear how many skaters." };
  if (placing !== null && of !== null && placing > of) return { ok: false, error: "Your placing cannot be bigger than the number of skaters." };
  const marks = draft.marks || {};
  const empty = placing === null && !Object.keys(marks).length && !String(draft.coach ?? "").trim() && !String(draft.note ?? "").trim();
  if (empty) return { ok: false, error: "Add a placing, a mark for an element, or a note first." };
  return { ok: true, result: sanitizeResult({ programId: draft.programId, placing, of, marks, coach: draft.coach, note: draft.note, recordedOn: today }) };
}

export function placingText(result) {
  if (!result || result.placing === null) return "";
  return result.of ? `${ordinal(result.placing)} of ${result.of}` : ordinal(result.placing);
}

/* ---- programs ---- */

export function newProgram({ name, music = {}, lengthSec = DEFAULT_LENGTH, kind = "free", eventId = "" }, makeId, today = todayISO()) {
  return sanitizeProgram({ id: makeId(), name, music, lengthSec, kind, eventId, created: today, elements: [], moments: [] });
}

export function newEvent({ name, date, place = "" }, makeId) {
  return sanitizeEvent({ id: makeId(), name, date, place, day: [], bring: DEFAULT_BRING.map((text) => ({ id: makeId(), text, done: false })) });
}

/* How far along a program is: elements chosen, every one placed on the rink, every one timed in the music. */
export function programStatus(p) {
  const total = p.elements.length;
  const placed = p.elements.filter((e) => e.x !== null).length;
  const timed = p.elements.filter((e) => e.at !== null).length;
  const planned = p.elements.filter((e) => e.x !== null && e.at !== null).length;
  const steps = { elements: total > 0, layout: total > 0 && placed === total, timing: total > 0 && timed === total };
  return { total, placed, timed, planned, steps, done: steps.layout && steps.timing };
}

/* How many of a program's elements are skills you have rated, and how many of those you have earned (4 skates or more). */
export function readiness(p, stats, earnedAt = 4) {
  const linked = p.elements.filter((e) => e.skillId);
  const confident = linked.filter((e) => ((stats.get && stats.get(e.skillId)) || { latest: 0 }).latest >= earnedAt).length;
  return { linked: linked.length, confident };
}

/* A spot for a new element when the skater did not tap one: along the rink in a zigzag, taking the first spot that is not on top of an
   element already there (so removing one and adding another never stacks them). When the rink is crowded, the roomiest spot on a
   fine grid. */
export function nextSpot(elements) {
  const taken = elements.filter((e) => e.x !== null);
  const zig = (i) => ({
    x: Math.round((0.12 + 0.76 * (((i % 7) + 0.5) / 7)) * 1000) / 1000,
    y: i % 2 ? 0.68 : 0.32,
  });
  /* The rink drawing is 346 by 206 units and a mark is 26 across, so 34 units apart keeps marks from touching. */
  const gap = (c) => (taken.length ? Math.min(...taken.map((t) => Math.hypot((t.x - c.x) * 346, (t.y - c.y) * 206))) : Infinity);
  for (let i = 0; i < 14; i++) if (gap(zig(i)) > 34) return zig(i);
  let best = zig(0);
  let room = -1;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 12; col++) {
      const c = { x: Math.round((0.08 + (0.84 * col) / 11) * 1000) / 1000, y: Math.round((0.14 + (0.72 * row) / 5) * 1000) / 1000 };
      const g = gap(c);
      if (g > room) {
        room = g;
        best = c;
      }
    }
  }
  return best;
}

export function addElement(p, { label, type = "move", skillId = "", x = null, y = null }, makeId) {
  if (p.elements.length >= LIMITS.elements) return { status: "full", program: p };
  const spot = x === null || y === null ? nextSpot(p.elements) : { x, y };
  const el = sanitizeElement({ id: makeId(), label, type, skillId, x: spot.x, y: spot.y, at: null, dur: 0 });
  if (!el) return { status: "invalid", program: p };
  return { status: "added", program: { ...p, elements: [...p.elements, el] }, element: el };
}

export function updateElement(p, elementId, patch) {
  return sanitizeProgram({ ...p, elements: p.elements.map((e) => (e.id === elementId ? { ...e, ...patch, id: e.id } : e)) });
}

export const moveElement = (p, elementId, x, y) => updateElement(p, elementId, { x, y });
export const removeElement = (p, elementId) => ({ ...p, elements: p.elements.filter((e) => e.id !== elementId) });

/* Swap an element with the one before (-1) or after (1) it. */
export function shiftElement(p, elementId, dir) {
  const i = p.elements.findIndex((e) => e.id === elementId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= p.elements.length) return p;
  const elements = [...p.elements];
  [elements[i], elements[j]] = [elements[j], elements[i]];
  return { ...p, elements };
}

/* Give every element a start and a length, evenly across the music, in the order they are listed. A skater then nudges them. */
export function spreadEvenly(p) {
  const n = p.elements.length;
  if (!n) return p;
  const slot = p.lengthSec / n;
  const elements = p.elements.map((e, i) => {
    const at = Math.round(i * slot);
    const dur = Math.max(3, Math.min(Math.round(slot * 0.6), p.lengthSec - at));
    return { ...e, at, dur };
  });
  return sanitizeProgram({ ...p, elements });
}

/* Changing the length keeps every time inside the music. */
export const setLength = (p, lengthSec) => sanitizeProgram({ ...p, lengthSec });

/* The elements whose start or length a piece of music this long would cut short. */
export const clipsAt = (p, lengthSec) => p.elements.filter((e) => e.at !== null && (e.at > lengthSec || e.at + e.dur > lengthSec)).map((e) => e.id);

export function addMoment(p, { at, text }, makeId) {
  if (p.moments.length >= LIMITS.moments) return { status: "full", program: p };
  const m = sanitizeMoment({ id: makeId(), at, text });
  if (!m) return { status: "invalid", program: p };
  return { status: "added", program: sanitizeProgram({ ...p, moments: [...p.moments, m] }) };
}
export const removeMoment = (p, momentId) => ({ ...p, moments: p.moments.filter((m) => m.id !== momentId) });

/* The timed elements as blocks on the music: where each starts and how wide it is, as a percent of the length. */
export function timelineBlocks(p) {
  return p.elements
    .filter((e) => e.at !== null)
    .map((e) => ({ id: e.id, label: e.label, type: e.type, at: e.at, dur: e.dur, left: (e.at / p.lengthSec) * 100, width: (Math.max(e.dur, 2) / p.lengthSec) * 100 }))
    .sort((a, b) => a.at - b.at);
}

/* Pairs of timed elements that overlap in the music (a length of 0 counts as one second). */
export function overlaps(p) {
  const timed = p.elements.filter((e) => e.at !== null).map((e) => ({ id: e.id, label: e.label, start: e.at, end: e.at + Math.max(e.dur, 1) })).sort((a, b) => a.start - b.start);
  const out = [];
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length && timed[j].start < timed[i].end; j++) out.push([timed[i].id, timed[j].id]);
  return out;
}

/* Where the last element ends, and how much music is left after it. */
export function programSpan(p) {
  const ends = p.elements.filter((e) => e.at !== null).map((e) => e.at + e.dur);
  const lastEnd = ends.length ? Math.max(...ends) : 0;
  return { lastEnd, room: Math.max(0, p.lengthSec - lastEnd) };
}

/* What is happening at a moment in the music: the element on now, and the next one coming. */
export function cueAt(p, sec) {
  const timed = p.elements.filter((e) => e.at !== null).sort((a, b) => a.at - b.at);
  const now = timed.find((e) => sec >= e.at && sec < e.at + Math.max(e.dur, 1)) || null;
  const next = timed.find((e) => e.at > sec) || null;
  return { now, next, untilNext: next ? next.at - sec : null };
}

/* ---- the rink ---- */

/* The placed elements, in order, as points in a drawing w wide and h tall. */
export function routePoints(p, w, h) {
  return p.elements.filter((e) => e.x !== null).map((e, i) => ({ id: e.id, n: p.elements.indexOf(e) + 1, x: Math.round(e.x * w * 10) / 10, y: Math.round(e.y * h * 10) / 10, order: i }));
}

/* A smooth path through points (a Catmull-Rom curve turned into Beziers). */
export function smoothPath(points) {
  const f = (n) => String(Math.round(n * 10) / 10);
  if (points.length === 0) return "";
  if (points.length === 1) return `M${f(points[0].x)} ${f(points[0].y)}`;
  if (points.length === 2) return `M${f(points[0].x)} ${f(points[0].y)}L${f(points[1].x)} ${f(points[1].y)}`;
  let d = `M${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/* ---- an event's day ---- */

export const sortDay = (items) => [...items].sort((a, b) => a.time.localeCompare(b.time) || a.label.localeCompare(b.label));

/* The hours a day covers, rounded out to half hours, for drawing it. */
export function dayRange(items) {
  if (!items.length) return { start: 8 * 60, end: 12 * 60 };
  const starts = items.map((i) => toMin(i.time));
  const ends = items.map((i) => toMin(i.time) + Math.max(i.mins, 15));
  let start = Math.floor(Math.min(...starts) / 30) * 30;
  const end = Math.min(24 * 60, Math.max(Math.ceil(Math.max(...ends) / 30) * 30, start + 60));
  start = Math.min(start, end - 60);   // near midnight, start earlier rather than run past the end of the day
  return { start, end };
}

export { fromMin, toMin };

/* ---- the address of each view ---- */

export const TABS = ["setup", "layout", "timing"];

/* #/compete, #/compete/p/ID/layout, #/compete/e/ID, #/compete/e/ID/results. Anything else is the hub. */
export function parseCompeteHash(hash) {
  const m = /^#\/compete(?:\/(p|e)\/([\w-]{1,80})(?:\/(\w+))?)?\/?$/.exec(String(hash || ""));
  if (!m || !m[1]) return { view: "hub" };
  if (m[1] === "p") return { view: "program", id: m[2], tab: TABS.includes(m[3]) ? m[3] : "layout" };
  return { view: "event", id: m[2], results: m[3] === "results" };
}

export function competeHref({ view = "hub", id: target = "", tab = "", results = false } = {}) {
  if (view === "program" && target) return `#/compete/p/${target}/${tab || "layout"}`;
  if (view === "event" && target) return `#/compete/e/${target}${results ? "/results" : ""}`;
  return "#/compete";
}
