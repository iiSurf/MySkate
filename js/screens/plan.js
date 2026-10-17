/* Plan: choose your ice slot, pick skills (suggested, your levels, or anything in the catalog), and see the minutes. */

import { html } from "../util.js";
import { icon, catDot, miniSkates, bar } from "../ui/parts.js";
import { $$ } from "../ui/dom.js";
import { openPicker } from "../ui/picker.js";
import { SLOTS, splitMinutes, move } from "../plan.js";
import { suggestNext, isSkating } from "../stats.js";
import { levelSkillIds, levelLabel } from "../catalog.js";

function pickRow(ctx, d, id, extra = "") {
  const sk = ctx.catalog.skills.get(id);
  const on = ctx.state.plan.skillIds.includes(id);
  const st = d.stats.get(id);
  return html`<div class="row row--pick" role="checkbox" tabindex="0" aria-checked="${on}" data-action="toggle" data-id="${id}">
    <span class="tick" aria-hidden="true" data-on="${on}">${icon("check")}</span>
    ${catDot(sk.cat)}
    <span class="grow">${sk.name}${sk.bonus ? html` <span class="chip chip--tag">Bonus</span>` : ""}${extra}</span>
    ${st && st.latest ? miniSkates(st.latest) : ""}
  </div>`;
}

function levelList(ctx, d, key, want, title) {
  if (key === "library") return "";
  const ids = levelSkillIds(ctx.catalog, key, { bonus: true }).filter((id) => want(ctx.catalog.skills.get(id)));
  if (!ids.length) return "";
  return html`<section class="card"><p class="eyebrow">${title}: ${levelLabel(ctx.catalog, key)}</p>${ids.map((id) => pickRow(ctx, d, id))}</section>`;
}

function summary(ctx) {
  const { state, catalog } = ctx;
  const ids = state.plan.skillIds;
  const mins = splitMinutes(state.plan.slotMin, ids.length);
  const planned = mins.reduce((a, b) => a + b, 0);
  const items = ids.map((id, i) => {
    const sk = catalog.skills.get(id);
    return html`<li class="plan-item">
      <span class="plan-n">${i + 1}</span>${catDot(sk.cat)}
      <span class="grow">${sk.name}<br><span class="dim">${mins[i]} min</span></span>
      <span class="plan-tools">
        <button class="icon-btn icon-btn--sm" type="button" data-action="up" data-i="${i}" aria-label="Move ${sk.name} earlier" ${i === 0 ? "disabled" : ""}>${icon("up")}</button>
        <button class="icon-btn icon-btn--sm" type="button" data-action="down" data-i="${i}" aria-label="Move ${sk.name} later" ${i === ids.length - 1 ? "disabled" : ""}>${icon("down")}</button>
        <button class="icon-btn icon-btn--sm" type="button" data-action="remove" data-i="${i}" aria-label="Remove ${sk.name}">${icon("x")}</button>
      </span>
    </li>`;
  });
  const over = planned > state.plan.slotMin;
  const startLabel = state.active ? "Back to the ice" : "Start session";
  return html`<aside class="card card--ice plan-summary" aria-labelledby="plan-title">
    <div class="split"><h2 id="plan-title">Your plan</h2><span class="chip chip--on">${state.plan.slotMin} min slot</span></div>
    ${ids.length ? html`<ol class="plan-list">${items}</ol>${bar({ pct: (planned / state.plan.slotMin) * 100, label: "Minutes planned" })}${over ? html`<p class="status status--warn">That is ${planned - state.plan.slotMin} minutes more than your slot. Every skill gets at least 5 minutes, so drop a few or pick a longer slot.</p>` : html`<p class="note">${planned} of ${state.plan.slotMin} minutes planned, shared evenly. You can change the order.</p>`}` : html`<p class="dim">Nothing yet. Tap a skill on the left to add it.</p>`}
    <div class="cluster">
      <button class="btn" type="button" data-action="${state.active ? "resume" : "start"}" ${ids.length || state.active ? "" : "disabled"}>${startLabel}</button>
      ${ids.length ? html`<button class="btn btn--glass btn--small" type="button" data-action="clear">Clear</button>` : ""}
    </div>
    ${state.active ? html`<p class="note">A session is already running. Starting a new one is not possible until you end it.</p>` : ""}
  </aside>`;
}

export function renderPlan(ctx) {
  const d = ctx.derive();
  const { state, catalog } = ctx;
  const picks = suggestNext(state, catalog, d.stats, d.today, 6);
  const customSlot = !SLOTS.includes(state.plan.slotMin);
  const suggested = picks.length
    ? html`<section class="card"><p class="eyebrow">Suggested for you</p>${picks.map((p) => pickRow(ctx, d, p.skillId, html` <span class="chip chip--tag">${p.reason}</span>`))}</section>`
    : "";
  const lists = [
    levelList(ctx, d, state.profile.levels.skills, isSkating, "Skating skills"),
    levelList(ctx, d, state.profile.levels.jumps, (s) => !isSkating(s), "Jumps and spins"),
  ];
  return html`
    <header class="screen-head"><div><p class="eyebrow">Before you go on the ice</p><h1>Plan your session</h1></div></header>
    <div class="plan-grid">
      <div class="stack">
        <section class="card">
          <p class="eyebrow" id="slot-title">Your ice slot, in minutes</p>
          <div class="limit-row" role="group" aria-labelledby="slot-title">
            ${SLOTS.map((m) => html`<button class="chip" type="button" data-action="slot" data-min="${m}" aria-pressed="${state.plan.slotMin === m}">${m}</button>`)}
            <input class="input input--num" type="number" inputmode="numeric" min="5" max="300" step="5" value="${customSlot ? state.plan.slotMin : ""}" placeholder="Other" data-input="slot-custom" aria-label="Custom slot in minutes">
          </div>
        </section>
        ${suggested}
        ${lists}
        <button class="btn btn--glass" type="button" data-action="browse">Browse every skill</button>
      </div>
      ${summary(ctx)}
    </div>`;
}

function openBrowse(ctx) {
  const sheet = openPicker(ctx, {
    title: "Browse every skill",
    isOn: (id) => ctx.state.plan.skillIds.includes(id),
    toggle: (id) => ctx.togglePlan(id),
    countText: () => `${ctx.state.plan.skillIds.length} in your plan`,
  });
  sheet.closed.then(() => ctx.update());
}

export function planActions(ctx) {
  return {
    toggle: (el) => {
      ctx.togglePlan(el.dataset.id);
      ctx.update();
    },
    slot: (el) => {
      ctx.state.plan.slotMin = Number(el.dataset.min);
      ctx.save();
      ctx.update();
    },
    up: (el) => {
      ctx.state.plan.skillIds = move(ctx.state.plan.skillIds, Number(el.dataset.i), -1);
      ctx.save();
      ctx.update();
    },
    down: (el) => {
      ctx.state.plan.skillIds = move(ctx.state.plan.skillIds, Number(el.dataset.i), 1);
      ctx.save();
      ctx.update();
    },
    remove: (el) => {
      ctx.state.plan.skillIds.splice(Number(el.dataset.i), 1);
      ctx.save();
      ctx.update();
    },
    clear: () => {
      ctx.state.plan.skillIds = [];
      ctx.save();
      ctx.update();
    },
    start: () => ctx.startSession(),
    resume: () => ctx.go("skate"),
    browse: () => openBrowse(ctx),
  };
}

export function planInputs(ctx) {
  return {
    "slot-custom": (el) => {
      const n = Number(el.value);
      if (el.value !== "" && n >= 5 && n <= 300) {
        ctx.state.plan.slotMin = Math.round(n);
        ctx.save();
        $$("[data-action='slot']").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.min) === ctx.state.plan.slotMin)));
      }
    },
  };
}

