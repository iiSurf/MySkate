/* Blade life: hours on the blades since they were last sharpened, against the skater's own limit. And an all-time total on the skates,
   which never starts over when they are sharpened. */

import { todayISO } from "./util.js";

/* Hours so far = the hours entered at setup or at the last sharpening, plus the on-ice time of every session since. */
export function bladeHours(state) {
  const from = Date.parse(state.blades.countedFrom) || 0;
  const seconds = state.sessions.filter((s) => Date.parse(s.startedAt) >= from).reduce((sum, s) => sum + s.onIceSec, 0);
  return state.blades.baseHours + seconds / 3600;
}

/* All time on the skates = the hours from before MySkate (blades.lifetimeBase, entered once) plus the on-ice time of every session
   saved. Sharpening never touches it. */
export function lifetimeHours(state) {
  return state.blades.lifetimeBase + state.sessions.reduce((sum, s) => sum + s.onIceSec, 0) / 3600;
}

/* The same in whole seconds, for showing as hours, minutes, and seconds. */
export function lifetimeSeconds(state) {
  return Math.round(lifetimeHours(state) * 3600);
}

/* Say how many hours are on the blades since the last sharpening. The difference is hours added (or taken off) by hand, so it goes
   into the all-time total too: the all-time total never has fewer hours than the blades do. */
export function setBladeHours(state, wanted) {
  const b = state.blades;
  const fromSessions = bladeHours(state) - b.baseHours;
  const next = Math.max(0, wanted - fromSessions);
  b.lifetimeBase = Math.min(LIFETIME_MAX, Math.max(0, b.lifetimeBase + (next - b.baseHours)));
  b.baseHours = next;
}

/* Say how many hours are on the skates in all. The sessions are counted already, so what is kept is the rest (the hours from before
   MySkate). It cannot be less than the hours on the blades since sharpening. */
export function setLifetimeHours(state, wanted) {
  const fromSessions = state.sessions.reduce((sum, s) => sum + s.onIceSec, 0) / 3600;
  const target = Math.max(wanted, bladeHours(state));
  state.blades.lifetimeBase = Math.min(LIFETIME_MAX, Math.max(0, target - fromSessions));
}

export const LIFETIME_MAX = 20000;

export function bladeInfo(state) {
  const hours = bladeHours(state);
  const limit = state.blades.limitHours;
  const pct = Math.max(0, Math.min(100, Math.round((hours / limit) * 100)));
  const left = limit - hours;
  let tone = "sharp";
  let label = "Sharp";
  if (pct >= 90) {
    tone = "due";
    label = "Time to sharpen";
  } else if (pct >= 60) {
    tone = "dull";
    label = "Getting dull";
  }
  return { hours, limit, pct, left, tone, label };
}

/* Start counting again from now, and remember when and at how many hours it happened. */
export function logSharpening(state, now = new Date()) {
  const hours = bladeHours(state);
  state.sharpenings.push({ date: todayISO(now), hours: Math.round(hours * 100) / 100 });
  state.blades.baseHours = 0;
  state.blades.countedFrom = now.toISOString();
}
