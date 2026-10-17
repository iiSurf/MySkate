/* Home: your level, your streak, your blades, and what to do next. */

import { html, fmtMinutes, fmtDate, fmtNum, fmt1, fmtClock, todayISO, daysBetween, addDays } from "../util.js";
import { icon, medallion, medal, bar, bladeArt, skateSvg, weekBarsHtml } from "../ui/parts.js";
import { showBadges, showFriends, showTests } from "./progress.js";
import { testList, skillsReadiness, freeReadiness, countdown } from "../testprep.js";
import { board } from "../friends.js";
import { initials } from "../ui/friends.js";
import { badgeRatio, progressText } from "../badges.js";
import { bladeInfo, bladeHours, logSharpening } from "../blades.js";
import { levelProgress, suggestNext, isSkating, isAir } from "../stats.js";
import { levelLabel } from "../catalog.js";
import { confirmSheet, toast, $ } from "../ui/dom.js";
import { twinkle } from "../ui/celebrate.js";
import { elapsedMs } from "../timer.js";
import { upcomingPicks, kindName, fmtRange } from "../ice.js";
import { costSummary, fmtMoney } from "../cost.js";
import { sortedGoals } from "../goals.js";

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
    <div class="cluster"><button class="btn" type="button" data-action="go-plan">Plan a session</button>${state.sessions.length ? "" : html`<button class="btn btn--glass" type="button" data-action="tour">How MySkate works</button>`}</div>
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

/* The skill goals still to reach, soonest first. Only shown while there is one. */
function goalsTile(ctx, d) {
  const open = sortedGoals(ctx.state.goals, d.stats, d.today).filter((g) => !g.met && ctx.catalog.skills.has(g.skillId));
  if (!open.length) return "";
  return html`<section class="card tile" aria-labelledby="goals-title">
    <div class="tile__head"><p class="eyebrow" id="goals-title">Goals</p><span class="chip chip--on">${open.length} open</span></div>
    <div>${open.slice(0, 3).map((g) => html`<div class="row"><span class="grow">${ctx.catalog.skills.get(g.skillId).name}<br><span class="dim">${g.tried ? `Now ${g.latest}` : "Not tried"}, goal ${g.target}</span></span>${g.countdown ? html`<span class="chip ${g.overdue ? "chip--coral" : "chip--gold"}">${g.countdown.label}</span>` : ""}</div>`)}</div>
    <button class="btn btn--glass btn--small" type="button" data-action="go-plan">Plan for my goals</button>
  </section>`;
}

/* The test you are working toward: days to go and how far along you are. Only shown once you have chosen a test. */
function testTile(ctx, d) {
  const { state, catalog } = ctx;
  const goal = state.profile.test && testList(catalog).find((t) => t.id === state.profile.test.id);
  if (!goal) return "";
  const skills = skillsReadiness(catalog, goal.levelKey, d.stats);
  const free = freeReadiness(goal.free, state.testChecks);
  const cd = countdown(state.profile.test.date, d.today);
  return html`<section class="card tile" aria-labelledby="test-title">
    <div class="tile__head"><p class="eyebrow" id="test-title">Your test</p>${cd ? html`<span class="chip ${cd.days < 0 ? "chip--coral" : "chip--gold"}">${cd.label}</span>` : ""}</div>
    <div class="hours"><span class="num">${goal.name}</span></div>
    <div class="stats">
      <div><p class="num stat-n">${skills.earned}/${skills.total}</p><p class="dim">skating skills</p></div>
      ${free.total ? html`<div><p class="num stat-n">${free.done}/${free.total}</p><p class="dim">free skate</p></div>` : ""}
    </div>
    <button class="btn btn--glass btn--small" type="button" data-action="go-tests">Open test readiness</button>
  </section>`;
}

/* Where you stand among your friends this week (their numbers are from their cards). Only shown once you have a friend. */
function friendsTile(ctx) {
  if (!ctx.state.friends.length) return "";
  const rows = board({ me: ctx.myCard(), friends: ctx.state.friends, period: "week" });
  const mine = rows.find((r) => r.you);
  return html`<section class="card tile" aria-labelledby="friends-title">
    <div class="tile__head"><p class="eyebrow" id="friends-title">Friends, last 7 days</p></div>
    <div class="hours"><span class="num">#${mine.rank}</span><span class="dim">of ${rows.length}</span></div>
    <div>${rows.slice(0, 3).map((r) => html`<div class="row ${r.you ? "row--you" : ""}"><span class="avatar" aria-hidden="true">${initials(r.name)}</span><span class="grow">${r.name}${r.you ? " (you)" : ""}</span><span class="chip chip--gold">${r.xp} XP</span></div>`)}</div>
    <button class="btn btn--glass btn--small" type="button" data-action="go-friends">Open friends</button>
  </section>`;
}

/* How many badges, the latest ones, and the next one you are closest to. Only shown once there is a session or a badge. */
function badgeTile(ctx) {
  const list = ctx.badges();
  const earned = list.filter((b) => b.earned);
  if (!earned.length && !ctx.state.sessions.length) return "";
  const recent = [...earned].sort((a, b) => (b.earnedOn || "").localeCompare(a.earnedOn || "")).slice(0, 4);
  const next = list.filter((b) => !b.earned && badgeRatio(b) > 0).sort((a, b) => badgeRatio(b) - badgeRatio(a))[0];
  return html`<section class="card tile" aria-labelledby="badge-title">
    <div class="tile__head"><p class="eyebrow" id="badge-title">Badges</p></div>
    <div class="hours"><span class="num">${earned.length}</span><span class="dim">of ${list.length} earned</span></div>
    ${recent.length ? html`<div class="medals" role="img" aria-label="Latest badges: ${recent.map((b) => b.name).join(", ")}">${recent.map((b) => medal(b))}</div>` : ""}
    ${next ? html`<p class="note">Next: <strong>${next.name}</strong>, ${progressText(next)}</p>` : ""}
    <button class="btn btn--glass btn--small" type="button" data-action="go-badges">Trophy case</button>
  </section>`;
}

/* The next few sessions you starred on the Ice tab. Only shown once you have added a rink. */
function iceTile(ctx, d) {
  const { state } = ctx;
  if (!state.rinks.length) return "";
  const next = upcomingPicks(state.iceSessions, new Date(), 3);
  const tomorrow = addDays(d.today, 1);
  const day = (date) => (date === d.today ? "Today" : date === tomorrow ? "Tomorrow" : fmtDate(date));
  return html`<section class="card tile" aria-labelledby="ice-title">
    <div class="tile__head"><p class="eyebrow" id="ice-title">Your next ice</p></div>
    ${next.length
      ? html`<div>${next.map((o) => html`<div class="row"><span class="grow"><strong>${day(o.date)}</strong> · ${fmtRange(o.start, o.end)}<br><span class="dim">${kindName(o.kind)} at ${(state.rinks.find((r) => r.id === o.rinkId) || { name: "a rink" }).name}</span></span></div>`)}</div>`
      : html`<p class="dim">${state.iceSessions.some((s) => s.pick) ? "Nothing picked in the next two weeks." : "Star the sessions you want on the Ice tab and they show up here."}</p>`}
    <button class="btn btn--glass btn--small" type="button" data-action="go-ice">See my ice week</button>
  </section>`;
}

/* What the ice costs. Only shown once a session has a cost. */
function costTile(ctx, d) {
  const sum = costSummary(ctx.state.sessions, d.today);
  if (!sum.all.costed) return "";
  const per = (n) => (n === null ? "–" : fmtMoney(n));
  return html`<section class="card tile" aria-labelledby="cost-title">
    <div class="tile__head"><p class="eyebrow" id="cost-title">Ice cost</p></div>
    <div class="hours"><span class="num">${sum.thisMonth.costed ? fmtMoney(sum.thisMonth.total) : "–"}</span><span class="dim">${sum.thisMonth.costed || !sum.thisMonth.sessions ? "this month" : "this month, no cost added"}</span></div>
    <div class="stats">
      <div><p class="num stat-n">${per(sum.all.perSession)}</p><p class="dim">per session</p></div>
      <div><p class="num stat-n">${per(sum.all.perHour)}</p><p class="dim">per hour</p></div>
      <div><p class="num stat-n">${fmtMoney(sum.all.total)}</p><p class="dim">in all</p></div>
    </div>
    <button class="btn btn--glass btn--small" type="button" data-action="go-progress">See by month</button>
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
    <div class="tiles">${xpTile(ctx, d)}${badgeTile(ctx)}${goalsTile(ctx, d)}${testTile(ctx, d)}${friendsTile(ctx)}${iceTile(ctx, d)}${levelTiles(ctx, d)}${bladeTile(ctx)}${weekTile(ctx, d)}${costTile(ctx, d)}</div>
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
    "go-ice": () => ctx.go("ice"),
    "go-tests": () => {
      showTests();
      ctx.go("progress");
    },
    "go-friends": () => {
      showFriends();
      ctx.go("progress");
    },
    "go-badges": () => {
      showBadges();
      ctx.go("progress");
    },
    "go-skate": () => ctx.go("skate"),
    "go-progress": () => ctx.go("progress"),
    tour: () => ctx.showTour(),
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
      ctx.checkBadges();
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

