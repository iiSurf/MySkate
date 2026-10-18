/* The rink diagram: a blueprint of the ice with your elements as numbered marks and the route between them. Tap empty ice to place an
   element, tap a mark to select it, drag a mark to move it, or use the arrow keys. */

import { html, esc } from "../util.js";
import { routePoints, smoothPath, roman, moveElement } from "../compete.js";

export const RINK = { w: 346, h: 206 };

/* The inside of the SVG for a program. selectedId gets the gold mark and its name. */
export function rinkInner(program, selectedId = null) {
  const pts = routePoints(program, RINK.w, RINK.h);
  const sel = pts.find((p) => p.id === selectedId);
  const selEl = sel && program.elements.find((e) => e.id === sel.id);
  const label = sel && selEl ? `${roman(sel.n)}  ${selEl.label}` : "";
  const boxW = Math.min(RINK.w - 16, 40 + label.length * 6.4);
  const boxX = sel ? Math.max(8, Math.min(RINK.w - 8 - boxW, sel.x - boxW / 2)) : 0;
  const boxY = sel ? (sel.y < 52 ? sel.y + 18 : sel.y - 44) : 0;
  return html`<rect class="cp-ice" x="2" y="2" width="${RINK.w - 4}" height="${RINK.h - 4}" rx="64"/>
    <line class="cp-mid" x1="${RINK.w / 2}" y1="2" x2="${RINK.w / 2}" y2="${RINK.h - 2}"/>
    <circle class="cp-mid" cx="${RINK.w / 2}" cy="${RINK.h / 2}" r="30" fill="none"/>
    ${pts.length > 1 ? html`<path class="cp-route" d="${smoothPath(pts)}"/>` : ""}
    ${pts.length ? html`<text class="cp-start" x="${Math.max(10, pts[0].x - 18)}" y="${Math.min(RINK.h - 8, pts[0].y + 32)}">START</text>` : ""}
    ${pts.map((p) => {
      const e = program.elements.find((x) => x.id === p.id);
      const on = p.id === selectedId;
      return html`<g class="cp-mark${on ? " is-sel" : ""}" data-el="${p.id}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${roman(p.n)}, ${e.label}. Press Enter to select, arrow keys to move."><circle class="hit" cx="${p.x}" cy="${p.y}" r="20"/><circle class="dot" cx="${p.x}" cy="${p.y}" r="${on ? 11 : 8.5}"/><text x="${p.x}" y="${p.y + (on ? 4.5 : 3.8)}">${p.n}</text></g>`;
    })}
    ${sel ? html`<g class="cp-callout" pointer-events="none"><rect x="${boxX}" y="${boxY}" width="${boxW}" height="26" rx="8"/><text x="${boxX + boxW / 2}" y="${boxY + 17}">${label}</text></g>` : ""}`;
}

/* Where a pointer is on the rink, as 0 to 1 across and down. Kept off the very edge, where the rink curves away. */
function spot(svg, event) {
  const r = svg.getBoundingClientRect();
  const x = (event.clientX - r.left) / r.width;
  const y = (event.clientY - r.top) / r.height;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return { x: Math.round(clamp(x, 0.06, 0.94) * 1000) / 1000, y: Math.round(clamp(y, 0.1, 0.9) * 1000) / 1000 };
}

/* Wire up the rink. api: getProgram(), selected(), onSelect(id, { keep }), onMove(id, x, y) (when a drag or key press finishes), onPlace(x, y).
   While a mark is dragged only the drawing changes; the move is saved when the finger lifts. Returns a cleanup. */
export function mountRink(svg, api) {
  let drag = null;
  let work = null;
  let suppress = false;

  const paint = (program) => {
    svg.innerHTML = rinkInner(program, api.selected()).text;
  };

  const down = (event) => {
    const mark = event.target.closest(".cp-mark");
    if (!mark || event.button > 0) return;
    drag = { id: mark.dataset.el, x0: event.clientX, y0: event.clientY, moved: false };
    work = api.getProgram();
    try {
      svg.setPointerCapture(event.pointerId);
    } catch (err) {
      /* a pointer that is already gone */
    }
    event.preventDefault();
  };
  const move = (event) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x0, event.clientY - drag.y0) < 5) return;
    drag.moved = true;
    const s = spot(svg, event);
    work = moveElement(work, drag.id, s.x, s.y);
    paint(work);
  };
  const finish = (event, cancelled) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    try {
      svg.releasePointerCapture(event.pointerId);
    } catch (err) {
      /* nothing to release */
    }
    if (cancelled) {
      /* the system took the touch (a call, a gesture): put the drawing back as it was saved, and change nothing */
      if (d.moved) paint(api.getProgram());
      return;
    }
    if (d.moved) {
      suppress = true;
      setTimeout(() => (suppress = false), 0);
      const el = work.elements.find((e) => e.id === d.id);
      api.onMove(d.id, el.x, el.y);
    } else {
      api.onSelect(d.id);
    }
  };
  const up = (event) => finish(event, false);
  const cancel = (event) => finish(event, true);
  /* A finger that starts on a mark must not scroll the page while it drags. */
  const touch = (event) => {
    if (event.target.closest(".cp-mark")) event.preventDefault();
  };
  const click = (event) => {
    if (suppress || event.target.closest(".cp-mark")) return;
    const s = spot(svg, event);
    api.onPlace(s.x, s.y);
  };
  const key = (event) => {
    const mark = event.target.closest(".cp-mark");
    if (!mark || event.ctrlKey || event.metaKey || event.altKey) return;
    const id = mark.dataset.el;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      api.onSelect(id, { keep: true });
      return;
    }
    const step = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[event.key];
    if (!step) return;
    event.preventDefault();
    const el = api.getProgram().elements.find((e) => e.id === id);
    api.onMove(id, Math.min(0.94, Math.max(0.06, el.x + step[0])), Math.min(0.9, Math.max(0.1, el.y + step[1])), { keep: true });
  };

  svg.addEventListener("pointerdown", down);
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", cancel);
  svg.addEventListener("touchstart", touch, { passive: false });
  svg.addEventListener("click", click);
  svg.addEventListener("keydown", key);
  return () => {
    svg.removeEventListener("pointerdown", down);
    svg.removeEventListener("pointermove", move);
    svg.removeEventListener("pointerup", up);
    svg.removeEventListener("pointercancel", cancel);
    svg.removeEventListener("touchstart", touch);
    svg.removeEventListener("click", click);
    svg.removeEventListener("keydown", key);
  };
}

export { esc };
