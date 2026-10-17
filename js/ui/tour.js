/* The quick tour: a sheet of short steps, each with a picture drawn from the app's own pieces.
   It opens by itself the first time, and any time from Home or Me. */

import { html } from "../util.js";
import { openSheet, $, $$ } from "./dom.js";
import { TOUR_STEPS } from "../tour.js";
import { SLOTS } from "../plan.js";
import { icon, miniSkates, bar, medallion, bladeArt, catDot } from "./parts.js";

/* The pictures are for looking at, not for pressing, so they are hidden from screen readers (the words say it all). */
const DEMOS = {
  loop: () => html`<div class="tour-loop">
    <div class="tour-node">${icon("plan")}<b>Plan</b></div><span class="tour-arrow">${icon("down")}</span>
    <div class="tour-node">${icon("skate")}<b>Skate</b></div><span class="tour-arrow">${icon("down")}</span>
    <div class="tour-node">${icon("chart")}<b>Grow</b></div>
  </div>`,
  ice: () => html`<div class="tour-ice">
    <article class="ice-card is-pick" style="--rk:#5fd8e6"><div class="ice-card__main"><span class="ice-time">2:30–3:30 PM</span><span class="ice-kind">Freestyle</span><span class="ice-rink"><i class="dot"></i>Highland Ice Arena</span></div><span class="ice-star" style="color:var(--sun)">${icon("star", "ic--fill")}</span></article>
    <article class="ice-card" style="--rk:#ffb98a"><div class="ice-card__main"><span class="ice-time">7–8:30 PM</span><span class="ice-kind">Public skate</span><span class="ice-rink"><i class="dot"></i>Lynnwood Ice Center</span></div><span class="ice-star">${icon("star")}</span></article>
  </div>`,
  plan: () => html`<div class="limit-row">${SLOTS.map((m) => html`<span class="chip ${m === 60 ? "chip--on" : ""}">${m}</span>`)}</div>
    <div class="tour-rows">
      <div class="tour-row">${catDot("skills")}<span class="grow">Forward crossovers</span><span class="chip chip--tag">Needs work</span></div>
      <div class="tour-row">${catDot("jumps")}<span class="grow">Waltz jump</span><span class="chip chip--tag">New</span></div>
      <div class="tour-row">${catDot("spins")}<span class="grow">Two-foot spin</span><span class="chip chip--tag">New</span></div>
    </div>`,
  skate: () => html`<div class="tour-clock"><span class="timer">12:40</span><span class="dim">of 1 h</span><span class="icon-btn">${icon("pause")}</span></div>
    <div class="tour-skates">${miniSkates(4)}</div>
    <div class="pair"><span class="btn btn--block">+ Landed</span><span class="btn btn--glass btn--block">+ Missed</span></div>`,
  grow: () => html`<div class="tour-grow">${medallion(3)}<div class="grow"><p><span class="num xp-big">70</span> <span class="dim">/ 200 XP</span></p>${bar({ pct: 35, cls: "bar--xp", label: "Example XP bar" })}</div></div>
    <span class="chip chip--gold">${icon("flame", "ic--fill")}2 weeks</span>`,
  blade: () => html`<div class="hours"><span class="num">17.5</span> <span class="dim">of 25 hours before sharpening</span></div>${bladeArt(70)}`,
  data: () => html`<div class="cluster"><span class="btn btn--small">Save a backup</span><span class="btn btn--glass btn--small">Spreadsheet (CSV)</span></div>
    <p class="note">Stays on this device</p>`,
};

/* The pictures the steps can ask for (tests check every step names one). */
export const TOUR_DEMOS = Object.keys(DEMOS);

const stepHtml = (step, i) => html`<section class="tour__step" data-step="${i}" aria-labelledby="tour-title-${i}">
  <h2 class="sheet__title sheet__title--small" id="tour-title-${i}">${step.title}</h2>
  <p class="tour__lead">${step.lead}</p>
  <div class="tour__demo" aria-hidden="true">${DEMOS[step.demo]()}</div>
  <ul class="tour__points">${step.points.map((p) => html`<li><strong>${p.b}</strong> ${p.t}</li>`)}</ul>
</section>`;

/* Opens the tour. Resolves when it closes. first: true shows "Skip the tour" instead of "Close". */
export function openTour({ first = false } = {}) {
  const n = TOUR_STEPS.length;
  const sheet = openSheet(
    html`<div class="tour">
      <div class="split"><p class="eyebrow" id="tour-count"></p><button class="chip" type="button" id="tour-skip" data-close="skip">${first ? "Skip the tour" : "Close"}</button></div>
      <div class="tour__stage">${TOUR_STEPS.map((s, i) => stepHtml(s, i))}</div>
      <p class="sr-only" id="tour-live" aria-live="polite"></p>
      <div class="sheet__foot">
        <button class="btn btn--glass btn--small" type="button" id="tour-back">Back</button>
        <div class="dots" aria-hidden="true">${TOUR_STEPS.map(() => html`<i></i>`)}</div>
        <button class="btn btn--small" type="button" id="tour-next">Next</button>
      </div>
    </div>`,
    { label: "How MySkate works" }
  );
  const root = sheet.dialog;
  root.classList.add("sheet--tour");
  const steps = $$(".tour__step", root);
  const dots = $$(".dots i", root);
  const back = $("#tour-back", root);
  const next = $("#tour-next", root);
  let at = 0;

  function show(i) {
    at = Math.max(0, Math.min(n - 1, i));
    steps.forEach((s, k) => s.classList.toggle("on", k === at));
    dots.forEach((d, k) => d.classList.toggle("on", k === at));
    back.disabled = at === 0;
    next.textContent = at === n - 1 ? "Got it" : "Next";
    $("#tour-count", root).textContent = `Step ${at + 1} of ${n}`;
    $("#tour-live", root).textContent = `Step ${at + 1} of ${n}: ${TOUR_STEPS[at].title}`;
    $(".tour__stage", root).scrollTop = 0;
  }

  back.addEventListener("click", () => show(at - 1));
  next.addEventListener("click", () => (at === n - 1 ? sheet.close("done") : show(at + 1)));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" && at < n - 1) show(at + 1);
    else if (e.key === "ArrowLeft" && at > 0) show(at - 1);
  });

  show(0);
  next.focus({ preventScroll: true });
  return sheet.closed;
}
