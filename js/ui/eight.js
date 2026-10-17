/* The week's figure eight, drawn from the numbers in week.js. On Home it is also the main button: tap it to plan, start, or go back
   to the session you are in. The first loop is the first session of the week, the second loop is the second. Gold is traced,
   dotted is still to come, and a spark sits where the blade is now. */

import { html, fmtDate, fmtMinutes } from "../util.js";
import { EIGHT_R, eightPoint } from "../week.js";

const R = EIGHT_R;

/* One unbroken line: the left loop counterclockwise, then the right loop clockwise. pathLength makes every dash a thousandth of it. */
const PATH = `M0 0A${R} ${R} 0 1 0-${2 * R} 0A${R} ${R} 0 1 0 0 0A${R} ${R} 0 1 1 ${2 * R} 0A${R} ${R} 0 1 1 0 0`;
const STAR = "M0-12 3-3 12 0 3 3 0 12-3 3-12 0-3-3z";

const loopText = (x, s) => html`<text class="eight__tiny" x="${x}" y="-8" text-anchor="middle">${fmtDate(s.date, { weekday: "long" })}</text><text class="eight__big" x="${x}" y="22" text-anchor="middle">${fmtMinutes(s.onIceSec / 60)}</text>`;
const callText = (x, tiny, go) => html`<text class="eight__tiny" x="${x}" y="-8" text-anchor="middle">${tiny}</text><text class="eight__go" x="${x}" y="19" text-anchor="middle">${go}</text>`;
const waitText = (x) => html`<g class="eight__dim"><text class="eight__tiny" x="${x}" y="-2" text-anchor="middle">Then</text><text class="eight__tiny" x="${x}" y="14" text-anchor="middle">once more</text></g>`;

/* week: from weekEight(). call: { tiny, go } is what the open loop says (Your turn, STEP ON). animate: trace the line as the screen opens. */
export function eightSvg(week, call, animate = false) {
  const done = Math.round(week.fraction * 1000);
  const p = eightPoint(week.fraction);
  const [first, second] = week.loops;
  const left = first ? loopText(-R, first) : callText(-R, call.tiny, call.go);
  const right = second ? loopText(R, second) : week.complete ? callText(R, "Whole", "") : first ? callText(R, call.tiny, call.go) : waitText(R);
  const trace = done
    ? html`<g class="eight__done">${["glow", "echo1", "echo2", "main"].map((k) => html`<path class="e e--${k}" d="${PATH}" pathLength="1000" style="stroke-dasharray:${done} 1000"/>`)}</g>`
    : "";
  return html`<svg class="eight__svg${animate ? " is-tracing" : ""}" viewBox="-160 -104 320 208" aria-hidden="true" focusable="false">
    <g transform="rotate(-9)">
      <path class="eight__guide" d="${PATH}" pathLength="1000"/>
      ${trace}
      <g transform="translate(${p.x} ${p.y})"><path class="sp eight__star" style="--d:${animate ? "1.3s" : "0s"}" d="${STAR}"/></g>
      ${left}${right}
    </g>
  </svg>`;
}
