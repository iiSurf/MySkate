/* Home: your level, your streak, your blades, and what to do next. */

import { html, fmtMinutes, fmtDate, fmtNum, fmt1, fmtClock, todayISO, daysBetween } from "../util.js";
import { icon, medallion, bar, bladeArt, skateSvg, weekBarsHtml } from "../ui/parts.js";
import { bladeInfo, bladeHours, logSharpening } from "../blades.js";
import { levelProgress, suggestNext, isSkating, isAir } from "../stats.js";
import { levelLabel } from "../catalog.js";
import { confirmSheet, toast, $ } from "../ui/dom.js";
import { twinkle } from "../ui/celebrate.js";
import { elapsedMs } from "../timer.js";

const ui = { bladeOpen: false };
const LIMITS = [20, 25, 30, 35];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function heroCard(ctx, d) {
  const { state } = ctx;
  if (state.active) {
    const ms = elapsedMs(state.active);
    return html`<section class="card hero-card">
      <div class="split"><p class="eyebrow">Session in progress</p><span class="chip chip--on">${state.active.running ? "Running" : "Paused"}</span></div>
      <p class="hero-card__line"><span class="num">${fmtClock(ms / 1000)}</span> <span class="dim">on ice of ${state.active.bookedMin} min</span></p>
      <button class="btn" type="button" data-action="go-skate">Back to the ice</button>
    </section>`;
  }
  const n = state.plan.skillIds.length;
  if (n) {
    return html`<section class="card hero-card">
      <p class="eyebrow">Your plan</p>
      <p class="hero-card__line"><span class="num">${n}</span> <span class="dim">${n === 1 ? "skill" : "skills"} for a ${state.plan.slotMin} minute slot</span></p>
      <div class="cluster"><button class="btn" type="button" data-action="start">Start session</button><button class="btn btn--glass" type="button" data-action="go-plan">Edit plan</button></div>
    </section>`;
  }
  return html`<section class="card hero-card">
    <p class="eyebrow">Ready to skate?</p>
    <p class="hero-card__line dim">Pick a few skills, pick your ice slot, and go.</p>
    <button class="btn" type="button" data-action="go-plan">Plan a session</button>
  </section>`;
}

function xpTile(ctx, d) {
  const L = d.level;
  const streakChip = d.streak.weeks > 0 ? html`<span class="chip chip--gold">${icon("flame", "ic--fill")}${d.streak.weeks} ${d.streak.weeks === 1 ? "week" : "weeks"}</span>` : "";
  return html`<section class="card card--glow tile" aria-labelledby="xp-title">
    <div class="tile__head"><p class="eyebrow" id="xp-title">XP level</p>${streakChip}</div>
    <div class="xp-top">${medallion(L.level)}<p><span class="num xp-big">${L.into}</span> <span class="dim">/ ${L.need} XP</span></p></div>
    ${bar({ pct: L.pct, cls: "bar--xp", label: "XP to the next level" })}
    <div><p class="eyebrow">Last 7 days</p>${weekBarsHtml(d.bars)}</div>
    <p class="note">${L.need - L.into} XP to level ${L.level + 1}.</p>
  </section>`;
}

function levelTiles(ctx, d) {
  const { state, catalog } = ctx;
  const sameKey = state.profile.levels.skills === state.profile.levels.jumps;
  const kinds = sameKey
    ? [{ key: state.profile.levels.skills, want: () => true, title: "Your level" }]
    : [
        { key: state.profile.levels.skills, want: isSkating, title: "Skating skills" },
        { key: state.profile.levels.jumps, want: isAir, title: "Jumps and spins" },
      ];
  const picks = suggestNext(state, catalog, d.stats, d.today, 4);
  return kinds.map((k) => {
    const p = levelProgress(catalog, k.key, d.stats, k.want);
    const name = k.key === "library" ? "Jump and spin library" : levelLabel(catalog, k.key);
    const skates = p.total > 0 && p.total <= 12 ? html`<div class="mini mini--big" role="img" aria-label="${p.earned} of ${p.total} skills earned">${p.ids.map((id, i) => skateSvg(i >= p.earned))}</div>` : bar({ pct: p.pct, thin: true, label: `${name} progress` });
    const next = picks.find((x) => k.want(catalog.skills.get(x.skillId)));
    return html`<section class="card tile" aria-label="${name}">
      <div class="tile__head"><p class="eyebrow">${name}</p><span class="chip chip--on">${k.title}</span></div>
      <div class="hours"><span class="num">${p.earned}</span><span class="dim">of ${p.total} skills earned</span></div>
      ${skates}
      <p class="note">${next ? html`Up next: <strong>${catalog.skills.get(next.skillId).name}</strong>` : "Everything here is earned. Try the next level."}</p>
      <button class="btn btn--glass btn--small" type="button" data-action="go-plan">Plan it</button>
    </section>`;
  });
}

function bladeTile(ctx) {
  const info = bladeInfo(ctx.state);
  const b = ctx.state.blades;
  const last = ctx.state.sharpenings[ctx.state.sharpenings.length - 1];
  const chipFor = (h) => html`<button class="chip" type="button" data-action="blade-limit" data-h="${h}" aria-pressed="${b.limitHours === h}">${h} h</button>`;
  return html`<section class="card tile" id="blade-tile" aria-labelledby="blade-title">
    <div class="tile__head">
      <p class="eyebrow" id="blade-title">Blade life</p>
      <button class="icon-btn icon-btn--sm" type="button" data-action="blade-edit" aria-expanded="${ui.bladeOpen}" aria-controls="blade-panel" aria-label="Edit blade settings">${icon("edit")}</button>
    </div>
    <div class="hours"><span class="num" id="blade-hours">${fmt1(info.hours)}</span><span class="dim">of <span id="blade-limit">${fmtNum(info.limit)}</span> hours before sharpening</span></div>
    ${bladeArt(info.pct)}
    <div class="split"><span class="chip ${info.tone === "due" ? "chip--coral" : info.tone === "dull" ? "chip--gold" : "chip--on"}" id="blade-state">${info.label}</span><span class="dim" id="blade-left"></span></div>
    ${bar({ pct: info.pct, cls: "bar--blade", thin: true, label: "Blade life used" })}
    <div class="edit" id="blade-panel" ${ui.bladeOpen ? "" : "hidden"}>
      <label class="field"><span>Skate and blade names (optional)</span><input class="input" type="text" data-input="blade-name" value="${b.name}" maxlength="80" autocomplete="off" placeholder="Edea Piano with Gold Seal blades"></label>
      <div class="field">
        <span id="limit-label">Sharpen after</span>
        <div class="limit-row" role="group" aria-labelledby="limit-label">${LIMITS.map(chipFor)}<input class="input input--num" id="limit-custom" type="number" inputmode="numeric" min="5" max="100" value="${fmtNum(b.limitHours)}" data-input="blade-limit-custom" aria-label="Custom number of hours"></div>
      </div>
      <div class="field">
        <span id="now-label">Hours on these blades so far</span>
        <div class="stepper">
          <button class="icon-btn icon-btn--sm" type="button" data-action="blade-step" data-d="-1" aria-label="One hour less">${icon("minus")}</button>
          <input class="input input--num" id="h-now" type="number" inputmode="decimal" step="0.25" min="0" max="500" value="${fmt1(info.hours)}" data-input="blade-hours" aria-labelledby="now-label">
          <button class="icon-btn icon-btn--sm" type="button" data-action="blade-step" data-d="1" aria-label="One hour more">${icon("plus")}</button>
        </div>
      </div>
      <p class="note">Most skaters sharpen between 20 and 35 hours. Use what your coach or sharpener says. MySkate adds your on-ice time after every session.${last ? ` Last sharpened ${fmtDate(last.date, { month: "short", day: "numeric" })} at ${fmtNum(last.hours)} hours.` : ""}</p>
    </div>
    <button class="btn btn--glass btn--small" type="button" data-action="blade-log">I just got them sharpened</button>
  </section>`;
}

function weekTile(ctx, d) {
  const { streak, totals } = d;
  const more = Math.max(0, streak.needed - streak.thisWeek);
  const line = streak.thisWeek >= streak.needed ? "Streak secured for this week." : more === 1 ? "One more session this week keeps your streak going." : `${more} more sessions this week build your streak.`;
  return html`<section class="card tile" aria-labelledby="week-title">
    <div class="tile__head"><p class="eyebrow" id="week-title">On the ice</p></div>
    <div class="hours"><span class="num">${fmt1(totals.weekMin / 60)}</span><span class="dim">hours this week</span></div>
    <div class="stats">
      <div><p class="num stat-n">${streak.thisWeek}</p><p class="dim">${streak.thisWeek === 1 ? "session" : "sessions"} this week</p></div>
      <div><p class="num stat-n">${fmt1(totals.monthMin / 60)}</p><p class="dim">hours this month</p></div>
      <div><p class="num stat-n">${fmt1(totals.allMin / 60)}</p><p class="dim">hours in all</p></div>
    </div>
    <p class="note">${line}</p>
  </section>`;
}

function recent(ctx, d) {
  const list = [...ctx.state.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3);
  if (!list.length) return "";
  return html`<section class="stack">
    <div class="split"><h2>Recent sessions</h2><button class="chip" type="button" data-action="go-progress">See all</button></div>
    <div class="card">${list.map((s) => {
      const xp = d.xp.bySession.get(s.id);
      return html`<div class="row"><span class="grow">${fmtDate(s.date)}<br><span class="dim">${fmtMinutes(s.onIceSec / 60)} on ice, ${s.entries.length} ${s.entries.length === 1 ? "skill" : "skills"}</span></span>${xp ? html`<span class="chip chip--gold">+${xp.xp} XP</span>` : ""}</div>`;
    })}</div>
  </section>`;
}

function nudge(ctx) {
  const { state } = ctx;
  if (!state.sessions.length) return "";
  const last = state.backup.lastExportAt;
  const days = last ? daysBetween(todayISO(new Date(last)), todayISO()) : 99;
  /* Nudge once a week, and only after the first few sessions if no backup was ever saved. */
  if (last ? days < 7 : state.sessions.length < 3) return "";
  return html`<section class="card nudge">
    <p><strong>${last ? `It has been ${days} days since your last backup.` : "You have not saved a backup yet."}</strong></p>
    <p class="dim">Your progress lives in this browser. A backup file keeps it safe if the browser clears its data.</p>
    <button class="btn btn--small" type="button" data-action="export-now">Save a backup</button>
  </section>`;
}

export function renderHome(ctx) {
  const d = ctx.derive();
  const name = ctx.state.profile.name.trim();
  return html`
    <header class="screen-head">
      <div><p class="eyebrow">${fmtDate(d.today, { weekday: "long", month: "long", day: "numeric" })}</p><h1>${greeting()}${name ? ", " + name : ""}</h1></div>
    </header>
    ${nudge(ctx)}
    ${heroCard(ctx, d)}
    <div class="tiles">${xpTile(ctx, d)}${levelTiles(ctx, d)}${bladeTile(ctx)}${weekTile(ctx, d)}</div>
    ${recent(ctx, d)}`;
}

/* Update the blade tile's numbers in place so typing in its fields never loses focus. */
export function paintBlade(ctx) {
  const root = $("#blade-tile");
  if (!root) return;
  const info = bladeInfo(ctx.state);
  const set = (sel, text) => {
    const n = $(sel, root);
    if (n) n.textContent = text;
  };
  set("#blade-hours", fmt1(info.hours));
  set("#blade-limit", fmtNum(info.limit));
  set("#blade-left", info.left > 0 ? `${fmt1(info.left)} ${info.left === 1 ? "hour" : "hours"} left` : `Over by ${fmt1(-info.left)} ${-info.left === 1 ? "hour" : "hours"}`);
  const art = $(".blade", root);
  if (art) art.style.setProperty("--p", info.pct + "%");
  const fill = $(".bar > i", root);
  if (fill) {
    fill.style.setProperty("--v", info.pct + "%");
    fill.style.setProperty("--vn", String(Math.max(1, info.pct)));
  }
  const chip = $("#blade-state", root);
  chip.className = "chip " + (info.tone === "due" ? "chip--coral" : info.tone === "dull" ? "chip--gold" : "chip--on");
  chip.textContent = info.label;
  root.querySelectorAll("[data-action='blade-limit']").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.h) === ctx.state.blades.limitHours)));
  const custom = $("#limit-custom", root);
  if (custom && document.activeElement !== custom) custom.value = fmtNum(info.limit);
  const now = $("#h-now", root);
  if (now && document.activeElement !== now) now.value = fmt1(info.hours);
}

function setHours(ctx, wanted) {
  const sessionHours = bladeHours(ctx.state) - ctx.state.blades.baseHours;
  ctx.state.blades.baseHours = Math.max(0, wanted - sessionHours);
}

export function homeActions(ctx) {
  return {
    "go-plan": () => ctx.go("plan"),
    "go-skate": () => ctx.go("skate"),
    "go-progress": () => ctx.go("progress"),
    start: () => ctx.startSession(),
    "export-now": () => ctx.exportBackup(),
    "blade-edit": (el) => {
      ui.bladeOpen = !ui.bladeOpen;
      $("#blade-panel").hidden = !ui.bladeOpen;
      el.setAttribute("aria-expanded", String(ui.bladeOpen));
    },
    "blade-limit": (el) => {
      ctx.state.blades.limitHours = Number(el.dataset.h);
      ctx.save();
      paintBlade(ctx);
    },
    "blade-step": (el) => {
      setHours(ctx, Math.max(0, bladeHours(ctx.state) + Number(el.dataset.d)));
      ctx.save();
      paintBlade(ctx);
    },
    "blade-log": async () => {
      const ok = await confirmSheet({
        title: "Blades just sharpened?",
        message: "This starts the hour count again from zero and remembers today's sharpening.",
        confirmLabel: "Yes, start fresh",
        tone: "gold",
      });
      if (!ok) return;
      logSharpening(ctx.state);
      ctx.save();
      paintBlade(ctx);
      const art = $("#blade-tile .blade");
      if (art) twinkle(art, 14);
      toast("Sharpening logged. Blade life is back to full.");
    },
  };
}

export function homeInputs(ctx) {
  return {
    "blade-name": (el) => {
      ctx.state.blades.name = el.value.slice(0, 80);
      ctx.save();
    },
    "blade-limit-custom": (el) => {
      const n = Number(el.value);
      if (el.value !== "" && n >= 5 && n <= 100) {
        ctx.state.blades.limitHours = n;
        ctx.save();
        paintBlade(ctx);
      }
    },
    "blade-hours": (el) => {
      const n = Number(el.value);
      if (el.value !== "" && n >= 0 && n <= 500) {
        setHours(ctx, n);
        ctx.save();
        paintBlade(ctx);
      }
    },
  };
}

