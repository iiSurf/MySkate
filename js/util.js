/* Small helpers shared by the app: safe HTML templates, dates, and formatting. */

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* Markup that is already safe to insert. Everything else interpolated into html`` is escaped. */
export class Raw {
  constructor(text) {
    this.text = text;
  }
  toString() {
    return this.text;
  }
}

export const raw = (text) => new Raw(String(text));

function part(value) {
  if (value instanceof Raw) return value.text;
  if (Array.isArray(value)) return value.map(part).join("");
  if (value == null) return "";
  /* Booleans print as true or false, so ARIA state attributes such as aria-pressed are never left empty. */
  return esc(value);
}

export function html(strings, ...values) {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += part(values[i]);
  });
  return new Raw(out);
}

export function uid() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function daysBetween(a, b) {
  return Math.round((parseISODate(b) - parseISODate(a)) / 86400000);
}

/* The Monday that starts the week containing this date. */
export function weekKey(iso) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return todayISO(d);
}

export function fmtClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtMinutes(min) {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

/* A length of time as hours, minutes, and seconds: [{ n: 10, unit: "hrs" }, { n: 14, unit: "mins" }, { n: 13, unit: "secs" }]. What is zero at
   the front is left out, and so is what is zero at the end (so no seconds when there are none); a zero in the middle stays. Nothing at all
   is "0 mins". */
export function durationParts(totalSec) {
  const t = Math.max(0, Math.round(Number(totalSec) || 0));
  const values = [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60];
  const first = values.findIndex((v) => v > 0);
  if (first < 0) return [{ n: 0, unit: "mins" }];
  const last = values.length - 1 - [...values].reverse().findIndex((v) => v > 0);
  const units = [["hr", "hrs"], ["min", "mins"], ["sec", "secs"]];
  return values.slice(first, last + 1).map((n, i) => ({ n, unit: units[first + i][n === 1 ? 0 : 1] }));
}

/* "10 hrs 14 mins 13 secs" */
export function fmtDuration(totalSec) {
  return durationParts(totalSec).map((p) => `${p.n} ${p.unit}`).join(" ");
}

/* The same in the short form a flap board spells out, one letter to a tile: "10 H 14 M 13 S" */
export function fmtDurationShort(totalSec) {
  return durationParts(totalSec).map((p) => `${p.n} ${p.unit[0].toUpperCase()}`).join(" ");
}

export function fmtNum(n) {
  return String(Math.round(n * 100) / 100);
}

/* One decimal, for hours. */
export function fmt1(n) {
  return String(Math.round(n * 10) / 10);
}

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function fmtDate(iso, opts = { weekday: "short", month: "short", day: "numeric" }) {
  return parseISODate(iso).toLocaleDateString(undefined, opts);
}
