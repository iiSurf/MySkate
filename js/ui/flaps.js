/* Flap tiles, like a rink's departures board: a label and a line of text, one tile per letter. The tiles are decoration; the
   whole line is read out as one piece of text. */

import { html } from "../util.js";

const MAX = 18;

export function flapRow(label, text, { hi = false } = {}) {
  const line = String(text).slice(0, MAX);
  return html`<div class="fl" role="img" aria-label="${label}: ${text}"><small aria-hidden="true">${label}</small><div class="flaps" aria-hidden="true">${[...line].map((c) => (c === " " ? html`<span class="f f--gap"></span>` : html`<span class="f${hi ? " f--hi" : ""}">${c}</span>`))}</div></div>`;
}
