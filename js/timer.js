/* The session in progress. Time is worked out from saved timestamps, never from counting ticks,
   so a locked phone, a throttled tab, or a refresh cannot make the clock drift or reset. */

import { uid, todayISO } from "./util.js";

export function newActive({ order, bookedMin, now = Date.now() }) {
  return { id: uid(), startedAt: now, bookedMin, order: [...order], index: 0, entries: {}, running: true, runStart: now, accumMs: 0 };
}

export function elapsedMs(active, now = Date.now()) {
  return active.accumMs + (active.running ? Math.max(0, now - active.runStart) : 0);
}

export function pauseActive(active, now = Date.now()) {
  if (!active.running) return active;
  return { ...active, running: false, accumMs: active.accumMs + Math.max(0, now - active.runStart), runStart: null };
}

export function resumeActive(active, now = Date.now()) {
  if (active.running) return active;
  return { ...active, running: true, runStart: now };
}

export function entryOf(active, skillId) {
  return active.entries[skillId] || { skillId, stars: 0, landed: 0, attempts: 0, note: "" };
}

export function setEntry(active, skillId, patch) {
  const next = { ...entryOf(active, skillId), ...patch };
  next.attempts = Math.max(0, next.attempts);
  next.landed = Math.max(0, Math.min(next.landed, next.attempts));
  return { ...active, entries: { ...active.entries, [skillId]: next } };
}

/* One more try at a jump: landed or missed. Undo takes the last one back. */
export function recordTry(active, skillId, landed) {
  const e = entryOf(active, skillId);
  return setEntry(active, skillId, { attempts: e.attempts + 1, landed: e.landed + (landed ? 1 : 0), seq: ((e.seq || "") + (landed ? "L" : "M")).slice(-200) });
}

export function undoTry(active, skillId) {
  const e = entryOf(active, skillId);
  const seq = e.seq || "";
  if (e.attempts === 0) return active;
  const last = seq.slice(-1);
  const wasLanded = last ? last === "L" : e.landed >= e.attempts;
  return setEntry(active, skillId, { attempts: e.attempts - 1, landed: e.landed - (wasLanded ? 1 : 0), seq: seq.slice(0, -1) });
}

export function addSkill(active, skillId) {
  if (active.order.includes(skillId)) return active;
  return { ...active, order: [...active.order, skillId] };
}

/* Turn the session in progress into a finished session record. Skills with no rating and no attempts are left out. */
export function finishActive(active, now = Date.now(), note = "") {
  const entries = active.order
    .map((id) => active.entries[id])
    .filter((e) => e && (e.stars > 0 || e.attempts > 0 || (e.note && e.note.trim())))
    .map((e) => ({ skillId: e.skillId, stars: e.stars, landed: e.landed, attempts: e.attempts, note: e.note || "" }));
  return {
    id: active.id,
    date: todayISO(new Date(active.startedAt)),
    startedAt: new Date(active.startedAt).toISOString(),
    bookedMin: active.bookedMin,
    onIceSec: Math.round(elapsedMs(active, now) / 1000),
    entries,
    note,
  };
}
