/* The guided tour on screen: a spotlight on the thing to tap, a sparkling path leading to it, and a card that says where to tap and
   what it does. The steps and the rules for moving on are in ../tour.js; this file draws them and watches the app.

   Nothing here blocks the app: the skater taps the real controls (in practice mode, on made-up data), and the tour notices what
   happened by looking at the real state, then moves on. Skip is always on the card. */

import { html, raw, clamp } from "../util.js";
import { openSheet, toast } from "./dom.js";
import { TOUR_STEPS, TABS, tabTarget, firstApplicable, settle, isDone, stepIndex } from "../tour.js";

const SVG_STAR = "M0-1C.12-.28.28-.12 1 0C.28.12.12.28 0 1C-.12.28-.28.12-1 0C-.28-.12-.12-.28 0-1Z";
const PAD = 7;
const DONE_PAUSE = 380;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const routeNow = () => {
  const m = location.hash.match(/^#\/(\w+)/);
  return m ? m[1] : "home";
};
const seen = (el) => {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
};

/* The first time, before anything starts: a short, friendly offer that can be turned down. Resolves true to go ahead. */
export async function offerTour() {
  const sheet = openSheet(
    html`<p class="eyebrow">Welcome</p>
      <h2 class="sheet__title">Learn it by doing</h2>
      <p class="note">Take a short practice run: plan a session, skate it, and save it, with sparkles showing where to tap and words saying what each thing does. Practice saves nothing, so your own data stays clean.</p>
      <div class="sheet__foot">
        <button class="btn btn--glass btn--small" type="button" data-close="skip">Skip for now</button>
        <button class="btn btn--small" type="button" data-close="go" id="tour-go">Show me around</button>
      </div>
      <p class="note">You can take it any time from Profile, under Help.</p>`,
    { label: "Guided tour" }
  );
  sheet.dialog.querySelector("#tour-go").focus({ preventScroll: true });
  return (await sheet.closed) === "go";
}

const star = (x, y, s, d) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path class="coach__star" d="${SVG_STAR}" style="--s:${s};--d:${d}s"/></g>`;

/* A point on a cubic curve. */
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/* Runs the tour. Practice mode is on for as long as it runs. Resolves with how it ended: "done" or "skip". */
export function runGuide(ctx) {
  const steps = TOUR_STEPS;
  ctx.beginPractice();

  const root = document.createElement("div");
  root.className = "coach";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Guided tour");
  root.innerHTML = `<div class="coach__dim"></div><div class="coach__spot"></div><svg class="coach__trail" aria-hidden="true" focusable="false"></svg>
    <p class="coach__flag">Practice · nothing is saved</p><div class="coach__bubble"></div><p class="sr-only" aria-live="polite" id="coach-live"></p>`;
  document.body.appendChild(root);
  document.documentElement.dataset.practice = "";
  const spot = root.querySelector(".coach__spot");
  const trail = root.querySelector(".coach__trail");
  const bubble = root.querySelector(".coach__bubble");
  const live = root.querySelector("#coach-live");

  let index = 0;
  let snap;
  let clicked = false;
  let timer = null;
  let raf = 0;
  let ended = false;
  let key = "";
  let scrollPending = true;
  let moveTimer = 0;
  let lastTarget = null;
  let lastMode = "";
  let lastRoute = "";
  let finished = false;   // the step was just done: hold still for a moment ("Nice!") instead of chasing a screen that has moved on
  let resolveDone = () => {};

  const view = () => ({
    state: ctx.state,
    catalog: ctx.catalog,
    route: routeNow(),
    find: (s) => document.querySelector(s),
    all: (s) => [...document.querySelectorAll(s)],
    has: (s) => Boolean(document.querySelector(s)),
  });

  function targetOf(step, v) {
    if (!step.target) return null;
    let t = typeof step.target === "function" ? step.target(v) : step.target;
    if (typeof t === "string") {
      try {
        t = document.querySelector(t);
      } catch (err) {
        t = null;
      }
    }
    return seen(t) ? t : null;
  }

  /* What to point at. An act step whose target is not on this screen points at the tab that gets you back. */
  function resolve(step, v) {
    let el = targetOf(step, v);
    if (step.inSheet) {
      const dialog = document.querySelector("dialog[open]");
      return { el: el && dialog && dialog.contains(el) ? el : null, fallback: false };
    }
    if (!el && step.kind === "act" && step.route && v.route !== step.route) {
      el = document.querySelector(tabTarget(step.route));
      return { el: seen(el) ? el : null, fallback: Boolean(el) };
    }
    return { el, fallback: false };
  }

  const schedule = () => {
    if (ended || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      evaluate();
    });
  };

  function enter(i) {
    index = clamp(i, 0, steps.length - 1);
    const step = steps[index];
    const v = view();
    snap = step.snap ? step.snap(v) : undefined;
    clicked = false;
    finished = false;
    scrollPending = true;
    key = "";
    clearTimeout(timer);
    timer = null;
    if (step.kind === "info" && step.route && v.route !== step.route) ctx.go(step.route);
    spot.classList.add("is-moving");
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => spot.classList.remove("is-moving"), 600);
    schedule();
  }

  function advance() {
    clearTimeout(timer);
    timer = null;
    const next = firstApplicable(steps, index + 1, view());
    if (next >= steps.length) finish("done");
    else enter(next);
  }

  function evaluate() {
    if (ended) return;
    const v = view();
    const step = steps[index];
    if (!timer) {
      if (isDone(step, v, snap, clicked)) {
        finished = true;
        timer = setTimeout(() => {
          timer = null;
          if (!ended && isDone(steps[index], view(), snap, clicked)) advance();
          else {
            finished = false;
            schedule();
          }
        }, step.inSheet ? 60 : DONE_PAUSE);
      } else {
        const back = settle(steps, index, v);
        if (back !== index) {
          enter(back);
          return;
        }
      }
    }
    paint(v);
  }

  /* The card for a step. It is only rebuilt when the step (or what it points at) changes, so a button keeps focus while the screen
     underneath redraws. */
  function renderCard(step, mode) {
    const k = `${step.id}|${mode}`;
    if (k === key) return;
    key = k;
    const pct = Math.round((index / (steps.length - 1)) * 100);
    const lastStep = index === steps.length - 1;
    const title = mode === "back" ? (step.back ? step.back.title : `Back to ${TABS[step.route]}`) : step.title;
    const text = mode === "back" ? (step.back ? step.back.text : `Tap ${TABS[step.route]} to keep going.`) : step.text;
    const hadFocus = bubble.contains(document.activeElement);
    bubble.innerHTML = html`<div class="coach__bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <p class="coach__kicker">${step.kind === "act" ? "Your turn" : lastStep ? "All done" : "Good to know"}</p>
      <h2 class="coach__title">${title}</h2>
      <p class="coach__text">${text}</p>
      <div class="coach__row">
        ${lastStep || step.alt ? html`<span></span>` : html`<button class="coach__skip" type="button" data-coach="skip">Skip tour</button>`}
        ${step.kind === "info" && step.alt ? html`<button class="coach__alt" type="button" data-coach="alt">${step.alt.label}</button>` : ""}
        ${step.kind === "info" ? html`<button class="btn btn--small" type="button" data-coach="next">${step.next || "Next"}</button>` : ""}
      </div>`.text;
    bubble.classList.remove("is-new");
    void bubble.offsetWidth;
    bubble.classList.add("is-new");
    live.textContent = `${title}. ${text}`;
    /* A card with a Next button takes focus (the card sits last on the page, so the keyboard would otherwise have a long way to it). A
       step to do leaves focus alone, unless a button on the card had it. */
    if (hadFocus || step.kind === "info") (bubble.querySelector('[data-coach="next"]') || bubble.querySelector("[data-coach]"))?.focus({ preventScroll: true });
  }

  function clearInline() {
    document.querySelectorAll("[data-coach-inline]").forEach((n) => n.remove());
    document.querySelectorAll(".coach-target").forEach((n) => n.classList.remove("coach-target"));
  }

  /* A step inside a sheet: the sheet floats above everything the tour can draw, so the words go in the sheet, above its content, and
     the button to tap is ringed. */
  function showInline(step, el, dialog) {
    const body = dialog.querySelector(".sheet__body");
    if (!body) return;
    let note = body.querySelector("[data-coach-inline]");
    if (!note || note.dataset.step !== step.id) {
      clearInline();
      note = document.createElement("div");
      note.className = "coach-inline";
      note.dataset.coachInline = "";
      note.dataset.step = step.id;
      note.innerHTML = html`<p class="coach__kicker">Your turn</p>
        <p class="coach-inline__text"><strong>${step.title}.</strong> ${step.text}</p>
        <div class="coach__row"><button class="coach__skip" type="button" data-coach="skip">Skip tour</button><svg class="coach-inline__sparks" viewBox="0 0 60 16" aria-hidden="true" focusable="false">${raw(star(8, 8, 6, 0) + star(30, 8, 5, 0.3) + star(52, 8, 6, 0.6))}</svg></div>`.text;
      body.prepend(note);
      live.textContent = `${step.title}. ${step.text}`;
      el.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
    }
    el.classList.add("coach-target");
  }

  function paint(v) {
    const step = steps[index];
    const dialog = document.querySelector("dialog[open]");
    const { el, fallback } = resolve(step, v);
    lastTarget = el;
    if (dialog) {
      root.hidden = true;
      if (step.inSheet && el) showInline(step, el, dialog);
      else clearInline();
      return;
    }
    clearInline();
    root.hidden = false;
    if (finished) {
      spot.hidden = true;
      trail.innerHTML = "";
      if (!key.startsWith(`${step.id}|`)) renderCard(step, "target");
      const kicker = bubble.querySelector(".coach__kicker");
      if (kicker) kicker.textContent = "Nice!";
      return;
    }
    const mode = fallback ? "back" : el ? "target" : "plain";
    /* When what we point at changes (the real target turns up after the way back, or the screen changes), look at it again. */
    if (mode !== lastMode || v.route !== lastRoute) scrollPending = true;
    lastMode = mode;
    lastRoute = v.route;
    renderCard(step, mode);
    place(el);
  }

  function place(el) {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const phone = vw < 600;
    const bw = Math.min(340, vw - 24);
    bubble.style.width = `${bw}px`;
    const bh = bubble.offsetHeight;
    const nav = document.querySelector("#nav");
    const nr = nav ? nav.getBoundingClientRect() : null;
    const navH = nr && nr.top > vh * 0.5 ? vh - nr.top : 0;
    const floor = vh - navH;

    if (!el) {
      spot.hidden = true;
      trail.innerHTML = "";
      root.classList.add("is-plain");
      bubble.style.left = `${(vw - bw) / 2}px`;
      bubble.style.top = `${Math.max(48, (floor - bh) / 2 - 20)}px`;
      return;
    }
    root.classList.remove("is-plain");

    let r = el.getBoundingClientRect();
    if (scrollPending) {
      scrollPending = false;
      const tall = r.height > (floor - 120) * 0.5;
      const fits = r.top >= 64 && r.bottom <= floor - bh - 70;
      if (!fits && !(el.closest("#nav"))) {
        const want = vh < 520 ? 66 : tall ? 84 : floor * 0.34 - r.height / 2;   // a short screen: the thing to tap goes near the top, so the card fits under it
        window.scrollBy({ top: r.top - Math.max(84, want), behavior: reduced() ? "auto" : "smooth" });
        r = el.getBoundingClientRect();
      }
    }

    const sx = r.left - PAD;
    const sy = r.top - PAD;
    const sw = r.width + PAD * 2;
    const sh = r.height + PAD * 2;
    const radius = (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 10) + PAD;
    spot.hidden = false;
    Object.assign(spot.style, { left: `${sx}px`, top: `${sy}px`, width: `${sw}px`, height: `${sh}px`, borderRadius: `${Math.min(radius, sh / 2 + 4)}px` });

    /* The card goes below the target if there is room, else above, else wherever there is most room (with a short gap). A tab in the
       side menu on a wide screen gets the card beside it, over the page, not over the other tabs. */
    const gap = phone ? 64 : 78;
    const below = floor - (sy + sh) - 12;
    const above = sy - 56;
    const rail = vw >= 960 && el.closest("#nav");
    let side = rail ? "right" : below >= bh + gap ? "below" : above >= bh + gap ? "above" : below >= above ? "below-tight" : "above-tight";
    let top;
    if (side === "right") {
      top = clamp(sy + sh / 2 - bh / 2, 56, Math.max(56, floor - bh - 12));
      const x = clamp(sx + sw + gap, 12, vw - bw - 12);
      bubble.style.left = `${x}px`;
      bubble.style.top = `${top}px`;
      drawTrail({ sx, sy, sw, sh, cx: sx + sw / 2 }, { left: x, top, bw, bh }, side, vw, vh);
      return;
    }
    if (side === "below") top = sy + sh + gap;
    else if (side === "above") top = sy - gap - bh;
    else if (side === "below-tight") top = clamp(sy + sh + 16, 56, Math.max(56, floor - bh - 12));
    else top = clamp(sy - 16 - bh, 56, Math.max(56, floor - bh - 12));
    const cx = sx + sw / 2;
    const left = clamp(cx - bw / 2, 12, vw - bw - 12);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;

    drawTrail({ sx, sy, sw, sh, cx }, { left, top, bw, bh }, side, vw, vh);
  }

  /* The path: dots marching from the card to the target, a little arrowhead, and sparkles along the way and around the target. */
  function drawTrail(s, b, side, vw, vh) {
    trail.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    const parts = [];
    const sparkle = [star(s.sx + s.sw, s.sy, 7, 0), star(s.sx, s.sy + s.sh, 6, 0.5), star(s.sx + s.sw * 0.5, s.sy + s.sh, 4.5, 1.0)];
    if (side === "right") {
      const cy = s.sy + s.sh / 2;
      const from = { x: b.left, y: clamp(cy, b.top + 36, b.top + b.bh - 36) };
      const to = { x: s.sx + s.sw + 6, y: cy };
      const dx = to.x - from.x;
      const sway = (from.y <= to.y ? -1 : 1) * 30;
      const c1 = { x: from.x + dx * 0.32, y: from.y + sway };
      const c2 = { x: from.x + dx * 0.7, y: to.y - sway };
      const d = `M${from.x.toFixed(1)} ${from.y.toFixed(1)}C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
      parts.push(`<path class="coach__glow" d="${d}"/><path class="coach__line" d="${d}"/>`);
      const angle = (Math.atan2(to.y - c2.y, to.x - c2.x) * 180) / Math.PI;
      parts.push(`<g transform="translate(${to.x.toFixed(1)} ${to.y.toFixed(1)}) rotate(${angle.toFixed(1)})"><path class="coach__arrow" d="M-10-8L1 0L-10 8"/></g>`);
      [0.2, 0.36, 0.52, 0.68, 0.84].forEach((t, i) => {
        const p = cubic(from, c1, c2, to, t);
        sparkle.push(star(p.x, p.y + (i % 2 ? 9 : -9), 4 + (i % 3), i * 0.22));
      });
    } else if (side === "below" || side === "above") {
      const down = side === "above";
      const from = { x: clamp(s.cx, b.left + 30, b.left + b.bw - 30), y: down ? b.top + b.bh : b.top };
      const to = { x: s.cx, y: down ? s.sy - 6 : s.sy + s.sh + 6 };
      const dy = to.y - from.y;
      const sway = (from.x <= to.x ? -1 : 1) * 38;
      const c1 = { x: from.x + sway, y: from.y + dy * 0.32 };
      const c2 = { x: to.x - sway, y: from.y + dy * 0.7 };
      const d = `M${from.x.toFixed(1)} ${from.y.toFixed(1)}C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
      parts.push(`<path class="coach__glow" d="${d}"/><path class="coach__line" d="${d}"/>`);
      const angle = (Math.atan2(to.y - c2.y, to.x - c2.x) * 180) / Math.PI;
      parts.push(`<g transform="translate(${to.x.toFixed(1)} ${to.y.toFixed(1)}) rotate(${angle.toFixed(1)})"><path class="coach__arrow" d="M-10-8L1 0L-10 8"/></g>`);
      [0.18, 0.34, 0.5, 0.66, 0.82].forEach((t, i) => {
        const p = cubic(from, c1, c2, to, t);
        sparkle.push(star(p.x + (i % 2 ? 9 : -9), p.y, 4 + (i % 3), i * 0.22));
      });
    }
    trail.innerHTML = parts.join("") + sparkle.join("");
  }

  /* Ending: take the tour away, close anything it left open, give the skater their own data back, and go home. */
  function finish(how) {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    clearTimeout(moveTimer);
    cancelAnimationFrame(raf);
    clearInterval(poll);
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("hashchange", schedule);
    observer.disconnect();
    clearInline();
    root.remove();
    delete document.documentElement.dataset.practice;
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    ctx.endPractice();
    ctx.go("home");
    if (how === "skip") toast("Tour skipped. You can take it any time from Profile, under Help.", 4500);
    resolveDone(how);
  }

  function onClick(event) {
    const btn = event.target.closest("[data-coach]");
    if (btn) {
      event.preventDefault();
      event.stopPropagation();
      const what = btn.dataset.coach;
      if (what === "skip") finish("skip");
      else if (what === "next") advance();
      else if (what === "alt") {
        const at = stepIndex(steps[index].alt.goto, steps);
        if (at >= 0) enter(at);
      }
      return;
    }
    if (lastTarget && lastTarget.contains(event.target)) clicked = true;
    schedule();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector("#screen"), { childList: true });
  observer.observe(document.body, { childList: true });
  document.addEventListener("click", onClick, true);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("hashchange", schedule);
  const poll = setInterval(schedule, 700);

  ctx.go("home");
  enter(0);
  return new Promise((resolve) => {
    resolveDone = resolve;
  });
}
