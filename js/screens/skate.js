/* Skate: the session at the rink. Big buttons, one skill at a time, a clock that cannot drift. */

import { html, fmtClock, fmtMinutes } from "../util.js";
import { icon, catDot, catName, ratingControl, miniSkates } from "../ui/parts.js";
import { openSheet, confirmSheet, toast, $ } from "../ui/dom.js";
import { openPicker } from "../ui/picker.js";
import { elapsedMs, pauseActive, resumeActive, entryOf, setEntry, recordTry, undoTry, addSkill, finishActive } from "../timer.js";
import { replayXp, levelFromXp } from "../xp.js";
import { twinkle } from "../ui/celebrate.js";
import { levelLabel } from "../catalog.js";
import { landedPct, skillStats } from "../stats.js";
import { keepAwake } from "../wake.js";
import { sanitizeCost } from "../cost.js";

function idle(ctx) {
  const n = ctx.state.plan.skillIds.length;
  return html`
    <header class="screen-head"><div><p class="eyebrow">At the rink</p><h1>Ready when you are</h1></div></header>
    <section class="card card--ice idle-card">
      ${n ? html`<p class="hero-card__line"><span class="num">${n}</span> <span class="dim">${n === 1 ? "skill" : "skills"} planned for a ${ctx.state.plan.slotMin} minute slot</span></p>
        <div class="cluster"><button class="btn" type="button" data-action="start">Start session</button><button class="btn btn--glass" type="button" data-action="go-plan">Edit plan</button></div>`
      : html`<p class="dim">Pick a few skills first, then start your session here.</p><button class="btn" type="button" data-action="go-plan">Plan a session</button>`}
    </section>
    <section class="card"><p class="eyebrow">What happens next</p><p class="dim">The clock counts only your time on ice, and you can pause it for a rest. Rate each skill with one to five stars. For jumps, tap Landed or Missed on every try. Your progress saves as you go.</p></section>`;
}

function queue(ctx, a) {
  return html`<aside class="card plan-summary" aria-label="This session">
    <p class="eyebrow">This session</p>
    <ol class="plan-list">${a.order.map((id, i) => {
      const sk = ctx.catalog.skills.get(id);
      const e = entryOf(a, id);
      return html`<li class="plan-item ${i === a.index ? "is-current" : ""}"><button class="queue-btn" type="button" data-action="goto" data-i="${i}" aria-current="${i === a.index}">
        <span class="plan-n">${i + 1}</span>${catDot(sk.cat)}<span class="grow">${sk.name}</span>${e.stars ? miniSkates(e.stars) : e.attempts ? html`<span class="chip chip--tag">${e.landed}/${e.attempts}</span>` : ""}
      </button></li>`;
    })}</ol>
    <button class="btn btn--glass btn--small" type="button" data-action="add">Add a skill</button>
  </aside>`;
}

function jumpCounter(e, glow) {
  const pct = e.attempts ? Math.round((e.landed / e.attempts) * 100) : null;
  const seq = (e.seq || "").slice(-10);
  const pips = [];
  for (let i = 0; i < 10; i++) {
    const ch = seq[i - (10 - seq.length)];
    pips.push(html`<i class="pip ${ch === "L" ? "on" : ch === "M" ? "miss" : ""}"></i>`);
  }
  return html`<section class="card ${glow ? "card--ice" : ""}" aria-label="Jump counter">
    <div class="split"><span class="num xp-big">${e.landed} of ${e.attempts}</span><span class="chip chip--on">${pct === null ? "No tries yet" : pct + "% landed"}</span></div>
    <div class="pips" aria-hidden="true">${pips}</div>
    <div class="pair"><button class="btn btn--block" type="button" data-action="landed">+ Landed</button><button class="btn btn--glass btn--block" type="button" data-action="missed">+ Missed</button></div>
    <button class="chip" type="button" data-action="undo" ${e.attempts ? "" : "disabled"}>${icon("undo")}Undo last try</button>
  </section>`;
}

export function renderSkate(ctx) {
  const a = ctx.state.active;
  if (!a) return idle(ctx);
  const id = a.order[a.index];
  const sk = ctx.catalog.skills.get(id);
  const e = entryOf(a, id);
  const isJump = sk.cat === "jumps";
  const st = skillStats(ctx.state.sessions).get(id);
  const last = st && st.history.length ? st.history[st.history.length - 1] : null;
  const counter = isJump ? jumpCounter(e, true) : "";
  return html`
    <section class="card timer-card" aria-label="On-ice clock">
      <div><p class="eyebrow">On ice</p><p class="timer" id="clock">00:00</p></div>
      <div class="timer-side"><p class="dim" id="left"></p><p class="dim">of ${fmtMinutes(a.bookedMin)}</p></div>
      <button class="icon-btn" type="button" data-action="toggle-run" aria-label="${a.running ? "Pause the clock" : "Resume the clock"}">${icon(a.running ? "pause" : "play")}</button>
    </section>
    <div class="skate-grid">
      <div class="stack">
        <section class="card skill-card">
          <div class="split"><p class="eyebrow">Skill ${a.index + 1} of ${a.order.length}</p><span class="chip">${catDot(sk.cat)}${catName(sk.cat)}</span></div>
          <h1 class="skill-title">${sk.name}</h1>
          <p class="dim">${levelLabel(ctx.catalog, sk.levelKey)}${last ? `. Last time: ${last.stars ? last.stars + (last.stars === 1 ? " star" : " stars") : "no rating"}${landedPct(st) !== null ? `, ${landedPct(st)}% landed overall` : ""}.` : ". First time you rate it."}</p>
        </section>
        ${counter}
        <section class="card ${isJump ? "" : "card--ice"}">
          <p class="eyebrow">How did it go?</p>
          ${ratingControl(e.stars)}
          <details class="note-box" ${e.note ? "open" : ""}>
            <summary>${e.note ? "Your note" : "Add a note"}</summary>
            <textarea class="input note-input" rows="3" maxlength="1000" data-input="entry-note" placeholder="What felt good, what to fix">${e.note}</textarea>
          </details>
        </section>
        <div class="placeholder">3D reference<br>coming soon</div>
        <div class="pair">
          <button class="btn btn--glass btn--block" type="button" data-action="prev" ${a.index === 0 ? "disabled" : ""}>Back</button>
          <button class="btn btn--block" type="button" data-action="next" ${a.index === a.order.length - 1 ? "disabled" : ""}>Next skill</button>
        </div>
        <button class="btn btn--coral btn--block" type="button" data-action="end">End session</button>
      </div>
      ${queue(ctx, a)}
    </div>`;
}

/* Called after each render: starts the on-screen clock. Returns a function that stops it. */
export function mountSkate(ctx) {
  const a0 = ctx.state.active;
  if (!a0) return () => {};
  keepAwake(a0.running);
  const tick = () => {
    const a = ctx.state.active;
    const clock = $("#clock");
    if (!a || !clock) return;
    const ms = elapsedMs(a);
    clock.textContent = fmtClock(ms / 1000);
    const left = a.bookedMin * 60 - ms / 1000;
    $("#left").textContent = left >= 0 ? `${fmtClock(left)} left` : `${fmtClock(-left)} over`;
  };
  tick();
  const timer = setInterval(tick, 500);
  document.addEventListener("visibilitychange", tick);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
  };
}

function patch(ctx, fn) {
  ctx.state.active = fn(ctx.state.active);
  ctx.save();
}

async function finish(ctx) {
  const a = ctx.state.active;
  const now = Date.now();
  const draft = finishActive(a, now, "");
  const before = replayXp(ctx.state.sessions);
  const levelBefore = levelFromXp(before.total).level;
  const after = replayXp([...ctx.state.sessions, draft]);
  const gain = after.bySession.get(draft.id);
  const rated = draft.entries.filter((x) => x.stars > 0).length;
  /* The cost starts as the price of the ice time it was planned from, or your usual cost. */
  const startCost = ctx.state.plan.cost ?? ctx.state.profile.defaultCost;
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">That's a session</h2>
      <div class="stats">
        <div><p class="num stat-n">${fmtClock(draft.onIceSec)}</p><p class="dim">on ice</p></div>
        <div><p class="num stat-n">${draft.entries.length}</p><p class="dim">${draft.entries.length === 1 ? "skill" : "skills"} worked</p></div>
        <div><p class="num stat-n">${rated}</p><p class="dim">rated</p></div>
      </div>
      <div class="card"><p class="eyebrow">You earned</p>${gain.parts.map((p) => html`<div class="row"><span class="grow">${p.label}</span><span class="chip chip--gold">+${p.xp}</span></div>`)}<div class="row"><strong class="grow">Total</strong><strong class="num">+${gain.xp} XP</strong></div></div>
      <label class="field"><span>What did this ice cost? (optional)</span><input class="input input--num" id="sess-cost" type="number" inputmode="decimal" min="0" max="999" step="0.5" value="${startCost === null || startCost === undefined ? "" : startCost}" placeholder="18"></label>
      <label class="field"><span>A note about today (optional)</span><textarea class="input note-input" id="sess-note" rows="2" maxlength="1000" placeholder="How did the session feel?"></textarea></label>
      <div class="sheet__foot">
        <button class="btn btn--glass btn--small" type="button" data-close="keep">Keep skating</button>
        <button class="btn btn--gold btn--small" type="button" data-close="save">Save session</button>
      </div>
      <button class="chip chip--discard" type="button" data-close="discard">Discard this session</button>`,
    { label: "Finish session" }
  );
  const noteEl = $("#sess-note", sheet.dialog);
  const costEl = $("#sess-cost", sheet.dialog);
  const choice = await sheet.closed;
  if (choice === "discard") {
    const ok = await confirmSheet({ title: "Discard this session?", message: "Nothing from it will be saved: no time, ratings, or XP.", confirmLabel: "Discard", cancelLabel: "Keep it" });
    if (!ok) return finish(ctx);
    ctx.state.active = null;
    keepAwake(false);
    ctx.save();
    toast("Session discarded.");
    ctx.go("home");
    return;
  }
  if (choice !== "save") return;
  draft.note = (noteEl && noteEl.value ? noteEl.value : "").slice(0, 1000);
  draft.cost = sanitizeCost(costEl ? costEl.value : "");
  ctx.state.sessions.push(draft);
  ctx.state.active = null;
  ctx.state.plan = { slotMin: ctx.state.profile.defaultSlotMin, skillIds: [] };
  keepAwake(false);
  ctx.save();
  const levelAfter = levelFromXp(after.total).level;
  ctx.go("home");
  toast(`Session saved. +${gain.xp} XP`);
  if (levelAfter > levelBefore) await ctx.levelUp(levelAfter);
  await ctx.checkBadges();
}

export function skateActions(ctx) {
  return {
    start: () => ctx.startSession(),
    "go-plan": () => ctx.go("plan"),
    "toggle-run": () => {
      patch(ctx, (a) => (a.running ? pauseActive(a) : resumeActive(a)));
      keepAwake(ctx.state.active.running);
      ctx.update();
    },
    rate: (el) => {
      const a = ctx.state.active;
      const id = a.order[a.index];
      const before = entryOf(a, id).stars;
      const n = Number(el.dataset.stars);
      const next = before === n ? 0 : n;
      patch(ctx, (x) => setEntry(x, id, { stars: next }));
      ctx.update();
      if (next > before) {
        const buttons = [...document.querySelectorAll(".rating button")];
        buttons.forEach((b, i) => {
          if (i >= before && i < next) {
            b.style.setProperty("--i", (i - before) * 0.07 + "s");
            b.classList.add("earn");
            b.addEventListener("animationend", () => b.classList.remove("earn"), { once: true });
          }
        });
        twinkle(buttons[next - 1], next === 5 ? 16 : 7);
      }
    },
    landed: () => {
      const a = ctx.state.active;
      patch(ctx, (x) => recordTry(x, a.order[a.index], true));
      ctx.update();
    },
    missed: () => {
      const a = ctx.state.active;
      patch(ctx, (x) => recordTry(x, a.order[a.index], false));
      ctx.update();
    },
    undo: () => {
      const a = ctx.state.active;
      patch(ctx, (x) => undoTry(x, a.order[a.index]));
      ctx.update();
    },
    prev: () => {
      patch(ctx, (a) => ({ ...a, index: Math.max(0, a.index - 1) }));
      ctx.update();
    },
    next: () => {
      patch(ctx, (a) => ({ ...a, index: Math.min(a.order.length - 1, a.index + 1) }));
      ctx.update();
    },
    goto: (el) => {
      patch(ctx, (a) => ({ ...a, index: Number(el.dataset.i) }));
      ctx.update();
    },
    add: () => {
      const sheet = openPicker(ctx, {
        title: "Add a skill to this session",
        startKey: ctx.state.profile.levels.jumps,
        isOn: (id) => ctx.state.active.order.includes(id),
        toggle: (id) => {
          if (ctx.state.active.order.includes(id)) toast("That skill is already in this session.");
          else patch(ctx, (a) => addSkill(a, id));
        },
        countText: () => `${ctx.state.active.order.length} in this session`,
      });
      sheet.closed.then(() => ctx.update());
    },
    end: () => finish(ctx),
  };
}

export function skateInputs(ctx) {
  return {
    "entry-note": (el) => {
      const a = ctx.state.active;
      if (!a) return;
      ctx.state.active = setEntry(a, a.order[a.index], { note: el.value.slice(0, 1000) });
      ctx.save();
    },
  };
}
