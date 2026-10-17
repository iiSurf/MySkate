/* Plan: choose your ice slot, pick skills (suggested, your levels, or anything in the catalog), and see the minutes. */

import { html, uid, todayISO, fmtDate } from "../util.js";
import { icon, catDot, miniSkates, bar } from "../ui/parts.js";
import { $, $$, openSheet, confirmSheet, toast } from "../ui/dom.js";
import { pickSkill } from "../ui/skillpick.js";
import { sortedGoals, addGoal, TARGETS } from "../goals.js";
import { addHomework, toggleHomework, sortedHomework, clearDone, MAX_TEXT } from "../homework.js";
import { openPicker } from "../ui/picker.js";
import { SLOTS, splitMinutes, move } from "../plan.js";
import { suggestNext, isSkating } from "../stats.js";
import { levelSkillIds, levelLabel } from "../catalog.js";

const ui = { hwDone: false };

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

/* Skill goals: a skill, the rating to reach, and a date. */
function goalRow(ctx, g) {
  const sk = ctx.catalog.skills.get(g.skillId);
  const skates = (n) => `${n} ${n === 1 ? "skate" : "skates"}`;
  const chip = g.met ? html`<span class="chip chip--gold">Reached</span>` : g.countdown ? html`<span class="chip ${g.overdue ? "chip--coral" : "chip--gold"}">${g.countdown.label}</span>` : "";
  return html`<div class="row goal-row">
    ${g.met ? html`<span class="tick" aria-hidden="true" data-on="true">${icon("check")}</span>` : catDot(sk.cat)}
    <span class="grow">${sk.name}<br><span class="dim">${g.met ? `Reached ${fmtDate(g.metOn, { month: "short", day: "numeric" })}, goal was ${skates(g.target)}` : g.tried ? `Now ${skates(g.latest)}, goal ${skates(g.target)}` : `Not tried yet, goal ${skates(g.target)}`}${g.date && !g.met ? ` by ${fmtDate(g.date, { month: "short", day: "numeric" })}` : ""}</span>${g.met ? "" : bar({ pct: g.pct, thin: true, label: `${sk.name}: ${g.pct} percent of the way to the goal` })}</span>
    ${chip}
    ${g.met ? "" : html`<button class="chip" type="button" data-action="goal-plan" data-id="${g.id}">${ctx.state.plan.skillIds.includes(g.skillId) ? "In plan" : "Plan it"}</button>`}
    <button class="icon-btn icon-btn--sm" type="button" data-action="goal-remove" data-id="${g.id}" aria-label="Remove the goal for ${sk.name}">${icon("x")}</button>
  </div>`;
}

function goalsCard(ctx, d) {
  const rows = sortedGoals(ctx.state.goals, d.stats, d.today).filter((g) => ctx.catalog.skills.has(g.skillId));
  return html`<section class="card" aria-labelledby="goals-title">
    <div class="split"><p class="eyebrow" id="goals-title">Goals</p><button class="chip" type="button" data-action="add-goal">Add a goal</button></div>
    ${rows.length ? html`<div>${rows.map((g) => goalRow(ctx, g))}</div>` : html`<p class="dim">Pick a skill, the rating you want, and a date if you have one. MySkate shows how close you are, and cheers when you get there.</p>`}
  </section>`;
}

/* Coach homework: what your coach asked for, to tick off. */
function homeworkRow(ctx, h) {
  const sk = h.skillId && ctx.catalog.skills.get(h.skillId);
  const chip = h.done ? "" : h.countdown ? html`<span class="chip ${h.overdue ? "chip--coral" : "chip--gold"}">${h.countdown.label}</span>` : "";
  return html`<div class="row hw-row ${h.done ? "is-done" : ""}">
    <button class="tick" type="button" role="checkbox" aria-checked="${h.done}" aria-label="${h.done ? "Done" : "Mark done"}: ${h.text}" data-action="hw-toggle" data-id="${h.id}">${icon("check")}</button>
    <span class="grow">${h.text}${sk ? html`<br><span class="dim">${sk.name}</span>` : ""}${h.due && !h.done ? html`<br><span class="dim">Due ${fmtDate(h.due, { weekday: "short", month: "short", day: "numeric" })}</span>` : ""}</span>
    ${chip}
    ${sk && !h.done ? html`<button class="chip" type="button" data-action="hw-plan" data-id="${h.id}">${ctx.state.plan.skillIds.includes(h.skillId) ? "In plan" : "Plan it"}</button>` : ""}
    <button class="icon-btn icon-btn--sm" type="button" data-action="hw-remove" data-id="${h.id}" aria-label="Remove: ${h.text}">${icon("x")}</button>
  </div>`;
}

function homeworkCard(ctx, d) {
  const rows = sortedHomework(ctx.state.homework, d.today);
  const open = rows.filter((h) => !h.done);
  const done = rows.filter((h) => h.done);
  return html`<section class="card" aria-labelledby="hw-title">
    <div class="split"><p class="eyebrow" id="hw-title">Coach homework</p><button class="chip" type="button" data-action="add-hw">Add homework</button></div>
    ${open.length ? html`<div>${open.map((h) => homeworkRow(ctx, h))}</div>` : html`<p class="dim">${done.length ? "All done. Nice work." : "Write down what your coach asks you to work on, with a day if there is one. Tick it off when you have done it."}</p>`}
    ${done.length
      ? html`<div class="cluster"><button class="chip" type="button" data-action="hw-done-toggle" aria-expanded="${ui.hwDone}">Done · ${done.length}</button>${ui.hwDone ? html`<button class="chip chip--discard" type="button" data-action="hw-clear">Clear done</button>` : ""}</div>${ui.hwDone ? html`<div>${done.map((h) => homeworkRow(ctx, h))}</div>` : ""}`
      : ""}
  </section>`;
}

async function openHomeworkSheet(ctx) {
  let skillId = "";
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">Add homework</h2>
      <label class="field"><span>What did your coach ask for?</span><textarea class="input note-input" id="hw-text" rows="3" maxlength="${MAX_TEXT}" placeholder="Keep your eyes up on the landing"></textarea></label>
      <div class="field"><span id="hw-skill-l">A skill it is about (optional)</span><div class="cluster"><button class="btn btn--glass btn--small" type="button" id="hw-skill" aria-labelledby="hw-skill-l hw-skill">Choose a skill</button><button class="chip" type="button" id="hw-skill-clear" hidden>Clear</button></div></div>
      <label class="field"><span>Due (optional)</span><input class="input" id="hw-due" type="date" min="${todayISO()}"></label>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="hw-save">Save</button></div>`,
    { label: "Add homework", sticky: true }
  );
  const root = sheet.dialog;
  const warn = $(".status--warn", root);
  const fail = (m) => {
    warn.textContent = m;
    warn.hidden = false;
  };
  $("#hw-text", root).focus();
  $("#hw-skill", root).addEventListener("click", async () => {
    const id = await pickSkill(ctx, { title: "A skill for this homework" });
    if (!id) return;
    skillId = id;
    $("#hw-skill", root).textContent = ctx.catalog.skills.get(id).name;
    $("#hw-skill-clear", root).hidden = false;
  });
  $("#hw-skill-clear", root).addEventListener("click", (e) => {
    skillId = "";
    $("#hw-skill", root).textContent = "Choose a skill";
    e.currentTarget.hidden = true;
  });
  $("#hw-save", root).addEventListener("click", () => {
    const due = $("#hw-due", root).value;
    if (due && due < todayISO()) return fail("That day has passed. Pick today or later, or leave it empty.");
    const result = addHomework(ctx.state.homework, { text: $("#hw-text", root).value, skillId, due }, uid(), todayISO());
    if (result.status === "invalid") return fail("Write what your coach asked for.");
    if (result.status === "full") return fail("MySkate holds up to 60 pieces of homework. Clear some done ones first.");
    ctx.state.homework = result.list;
    ctx.save();
    sheet.close("saved");
    ctx.update();
    toast("Homework added.");
  });
  return sheet.closed;
}

/* The sheet for setting a goal. */
async function openGoalSheet(ctx) {
  const d = ctx.derive();
  let skillId = null;
  let target = 4;
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">Set a goal</h2>
      <div class="field"><span id="gs-skill-l">Skill</span><button class="btn btn--glass btn--small" type="button" id="gs-skill" aria-labelledby="gs-skill-l gs-skill">Choose a skill</button></div>
      <div class="field"><span id="gs-target-l">Reach this rating</span><div class="limit-row" id="gs-target" role="group" aria-labelledby="gs-target-l">${TARGETS.map((n) => html`<button class="chip" type="button" data-n="${n}" aria-pressed="${n === target}">${n} skates</button>`)}</div></div>
      <label class="field"><span>By this day (optional)</span><input class="input" id="gs-date" type="date" min="${todayISO()}"></label>
      <p class="note">A goal is reached when the skill's latest rating is at or above the target. 4 skates is how MySkate counts a skill as earned.</p>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="gs-save">Save goal</button></div>`,
    { label: "Set a goal", sticky: true }
  );
  const root = sheet.dialog;
  const warn = $(".status--warn", root);
  const fail = (m) => {
    warn.textContent = m;
    warn.hidden = false;
  };
  $("#gs-skill", root).addEventListener("click", async () => {
    const id = await pickSkill(ctx, { title: "Choose a skill for your goal" });
    if (!id) return;
    skillId = id;
    $("#gs-skill", root).textContent = ctx.catalog.skills.get(id).name;
    warn.hidden = true;
  });
  $("#gs-target", root).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-n]");
    if (!b) return;
    target = Number(b.dataset.n);
    $$("button", $("#gs-target", root)).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  $("#gs-save", root).addEventListener("click", () => {
    const date = $("#gs-date", root).value;
    if (!skillId) return fail("Choose a skill first.");
    if (date && date < todayISO()) return fail("That day has passed. Pick today or later, or leave it empty.");
    const st = d.stats.get(skillId);
    if (st && st.latest >= target) return fail(`You are already at ${st.latest} ${st.latest === 1 ? "skate" : "skates"} on that skill. Choose a higher rating.`);
    const result = addGoal(ctx.state.goals, { skillId, target, date }, uid(), todayISO());
    if (result.status === "full") return fail("MySkate holds up to 30 goals. Remove one first.");
    if (result.status === "already") return fail("You already have that exact goal.");
    ctx.state.goals = result.goals;
    ctx.save();
    sheet.close("saved");
    ctx.update();
    toast(result.status === "updated" ? "Goal changed." : "Goal set.");
  });
  return sheet.closed;
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
          <button class="chip slot-link" type="button" data-action="go-ice">Find ice time</button>
        </section>
        ${goalsCard(ctx, d)}
        ${homeworkCard(ctx, d)}
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
    "add-hw": () => openHomeworkSheet(ctx),
    "hw-toggle": (el) => {
      ctx.state.homework = toggleHomework(ctx.state.homework, el.dataset.id, todayISO());
      ctx.save();
      ctx.update();
      ctx.checkBadges();
    },
    "hw-plan": (el) => {
      const h = ctx.state.homework.find((x) => x.id === el.dataset.id);
      if (h && h.skillId && !ctx.state.plan.skillIds.includes(h.skillId)) ctx.togglePlan(h.skillId);
      ctx.update();
    },
    "hw-remove": (el) => {
      ctx.state.homework = ctx.state.homework.filter((x) => x.id !== el.dataset.id);
      ctx.save();
      ctx.update();
    },
    "hw-done-toggle": () => {
      ui.hwDone = !ui.hwDone;
      ctx.update();
    },
    "hw-clear": () => {
      ctx.state.homework = clearDone(ctx.state.homework);
      ui.hwDone = false;
      ctx.save();
      ctx.update();
    },
    "add-goal": () => openGoalSheet(ctx),
    "goal-plan": (el) => {
      const g = ctx.state.goals.find((x) => x.id === el.dataset.id);
      if (g && !ctx.state.plan.skillIds.includes(g.skillId)) ctx.togglePlan(g.skillId);
      ctx.update();
    },
    "goal-remove": async (el) => {
      const g = ctx.state.goals.find((x) => x.id === el.dataset.id);
      if (!g) return;
      const ok = await confirmSheet({ title: "Remove this goal?", message: `The goal for ${ctx.catalog.skills.get(g.skillId).name} goes away. Your ratings stay.`, confirmLabel: "Remove" });
      if (!ok) return;
      ctx.state.goals = ctx.state.goals.filter((x) => x.id !== g.id);
      ctx.save();
      ctx.update();
    },
    start: () => ctx.startSession(),
    resume: () => ctx.go("skate"),
    browse: () => openBrowse(ctx),
    "go-ice": () => ctx.go("ice"),
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

