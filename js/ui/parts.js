/* Small pieces of markup used across screens. Everything returns safe Raw markup. */

import { html, raw, fmtClock } from "../util.js";

export const icon = (name, cls = "") => raw(`<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`);

export const skateSvg = (off = false) => raw(`<svg class="skate${off ? " off" : ""}" aria-hidden="true"><use href="assets/skate.svg#skate"/></svg>`);

/* Five skates, the first n earned. */
export function miniSkates(n, total = 5) {
  const items = [];
  for (let i = 0; i < total; i++) items.push(skateSvg(i >= n));
  return html`<span class="mini" role="img" aria-label="${n} of ${total} skates">${items}</span>`;
}

export function bar({ pct, cls = "", thin = false, label = "Progress" }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return html`<div class="bar ${cls} ${thin ? "bar--thin" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" aria-label="${label}"><i style="--v:${v}%;--vn:${Math.max(1, v)}"></i></div>`;
}

export const medallion = (level, cls = "") => html`<div class="level ${cls}" role="img" aria-label="Level ${level}">${level}</div>`;

export const catDot = (cat) => {
  const cls = cat === "jumps" ? " cat--jumps" : cat === "spins" ? " cat--spins" : "";
  const title = cat === "jumps" ? "Jump" : cat === "spins" ? "Spin" : "Skating skill";
  return raw(`<i class="cat${cls}" title="${title}"></i>`);
};

export const catName = (cat) => (cat === "jumps" ? "Jump" : cat === "spins" ? "Spin" : "Skating skill");

export function bladeArt(pct) {
  const art = `<svg viewBox="0 0 250 44" aria-hidden="true"><use href="assets/skate.svg#blade" width="250" height="44"/></svg>`;
  return raw(`<div class="blade" style="--p:${pct}%">${art.replace("<svg", '<svg class="blade__dull"')}${art.replace("<svg", '<svg class="blade__fresh"')}<i class="blade__mark"></i></div>`);
}

export function weekBarsHtml(bars) {
  const max = Math.max(1, ...bars.map((b) => b.xp));
  const todayIndex = bars.length - 1;
  const label = bars.map((b) => `${b.xp} XP`).join(", ");
  return html`<div class="weekbars" role="img" aria-label="XP per day over the last seven days: ${label}">${bars.map(
    (b, i) => html`<i class="${i === todayIndex ? "today" : ""} ${b.xp === 0 ? "none" : ""}" style="--h:${b.xp === 0 ? 6 : Math.max(14, Math.round((b.xp / max) * 100))}%"></i>`
  )}</div>`;
}

/* The rating control: five skates, tap one to set it, tap the same one again to clear it. */
export function ratingControl(value, label = "Rating, in skates") {
  const texts = ["Just trying", "Rough", "Getting there", "Solid", "Consistent"];
  const buttons = [1, 2, 3, 4, 5].map(
    (n) => html`<button type="button" data-action="rate" data-stars="${n}" aria-pressed="${n <= value}" aria-label="${n} ${n === 1 ? "skate" : "skates"}: ${texts[n - 1]}">${skateSvg()}</button>`
  );
  return html`<div class="rating" role="group" aria-label="${label}">${buttons}</div><p class="rating-label" aria-live="polite">${value ? `${value} ${value === 1 ? "skate" : "skates"}: ${texts[value - 1]}` : "Tap a skate"}</p>`;
}

export const clockText = (ms) => fmtClock(ms / 1000);

/* A badge medal: gold when earned, a dashed ghost when not. */
export const medal = (b, { locked = false, xl = false } = {}) => html`<span class="medal ${locked ? "medal--locked" : ""} ${xl ? "medal--xl" : ""}" aria-hidden="true">${icon(b.icon)}</span>`;
