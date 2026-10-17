/* Blade life: hours on the blades since they were last sharpened, against the skater's own limit. */

import { todayISO } from "./util.js";

/* Hours so far = the hours entered at setup or at the last sharpening, plus the on-ice time of every session since. */
export function bladeHours(state) {
  const from = Date.parse(state.blades.countedFrom) || 0;
  const seconds = state.sessions.filter((s) => Date.parse(s.startedAt) >= from).reduce((sum, s) => sum + s.onIceSec, 0);
  return state.blades.baseHours + seconds / 3600;
}

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
