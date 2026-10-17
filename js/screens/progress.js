/* Progress: totals, levels, every skill you have tried, and every session. */

import { html, raw, fmtMinutes, fmtDate, fmt1, addDays, weekKey } from "../util.js";
import { catDot, catName, miniSkates, bar, medallion } from "../ui/parts.js";
import { openSheet, confirmSheet, toast, $ } from "../ui/dom.js";
import { levelProgress, landedPct, minutesOnIce, EARNED_AT } from "../stats.js";
import { nextLevelKey, levelLabel } from "../catalog.js";

const ui = { tab: "overview", open: null, filter: "all" };

const TABS = [
  ["overview", "Overview"],
  ["skills", "Skills"],
  ["sessions", "Sessions"],
];

function weeklyChart(ctx, d) {
  const start = weekKey(d.today);
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const wk = addDays(start, -7 * i);
    weeks.push({ wk, min: minutesOnIce(ctx.state.sessions, wk, addDays(wk, 6)) });
  }
  const max = Math.max(1, ...weeks.map((w) => w.min));
  const label = weeks.map((w) => `${fmtMinutes(w.min)}`).join(", ");
  return html`<div class="wkchart" role="img" aria-label="Time on ice for the last eight weeks: ${label}">${weeks.map(
    (w, i) => html`<div class="wk"><i class="${i === weeks.length - 1 ? "today" : ""} ${w.min === 0 ? "none" : ""}" style="--h:${w.min === 0 ? 4 : Math.max(10, Math.round((w.min / max) * 100))}%"></i><span>${fmtDate(w.wk, { month: "numeric", day: "numeric" })}</span></div>`
  )}</div>`;
}

function overview(ctx, d) {
  const { state, catalog } = ctx;
  const { totals, streak, level } = d;
  const keys = [...new Set([state.profile.levels.skills, state.profile.levels.jumps])];
  const levelCards = keys.map((key) => {
    const p = levelProgress(catalog, key, d.stats);
    const next = nextLevelKey(catalog, key);
    const np = next ? levelProgress(catalog, next, d.stats) : null;
    const name = key === "library" ? "Jump and spin library" : levelLabel(catalog, key);
    return html`<section class="card tile">
      <div class="tile__head"><p class="eyebrow">${name}</p><span class="chip chip--on">${p.earned} of ${p.total}</span></div>
      ${bar({ pct: p.pct, label: `${name} progress` })}
      ${np ? html`<div class="split"><span class="dim">Next: ${levelLabel(catalog, next)}</span><span class="dim">${np.earned} of ${np.total}</span></div>${bar({ pct: np.pct, thin: true, label: "Next level progress" })}` : ""}
    </section>`;
  });
  const movers = [...d.stats.values()]
    .filter((s) => s.history.filter((h) => h.stars > 0).length >= 2)
    .map((s) => {
      const rated = s.history.filter((h) => h.stars > 0);
      return { s, delta: rated[rated.length - 1].stars - rated[0].stars, from: rated[0].stars, to: rated[rated.length - 1].stars };
    })
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  return html`
    <div class="tiles">
      <section class="card card--glow tile">
        <div class="tile__head"><p class="eyebrow">Your level</p></div>
        <div class="xp-top">${medallion(level.level)}<p><span class="num xp-big">${d.xp.total}</span> <span class="dim">XP in all</span></p></div>
        <p class="note">${streak.weeks > 0 ? `${streak.weeks} ${streak.weeks === 1 ? "week" : "weeks"} in a row with ${streak.needed} or more sessions.` : `Skate ${streak.needed} times in a week to start a streak.`}</p>
      </section>
      <section class="card tile">
        <div class="tile__head"><p class="eyebrow">On the ice</p></div>
        <div class="stats">
          <div><p class="num stat-n">${fmt1(totals.weekMin / 60)}</p><p class="dim">hours this week</p></div>
          <div><p class="num stat-n">${fmt1(totals.monthMin / 60)}</p><p class="dim">hours this month</p></div>
          <div><p class="num stat-n">${fmt1(totals.allMin / 60)}</p><p class="dim">hours in all</p></div>
          <div><p class="num stat-n">${totals.sessions}</p><p class="dim">${totals.sessions === 1 ? "session" : "sessions"}</p></div>
        </div>
      </section>
      ${levelCards}
      <section class="card tile wide">
        <div class="tile__head"><p class="eyebrow">Hours by week</p></div>
        ${weeklyChart(ctx, d)}
      </section>
      ${movers.length ? html`<section class="card tile"><div class="tile__head"><p class="eyebrow">Most improved</p></div>${movers.map((m) => html`<div class="row"><span class="grow">${catalog.skills.get(m.s.skillId).name}</span><span class="chip chip--gold">${m.from} to ${m.to}</span></div>`)}</section>` : ""}
    </div>`;
}

function skillsTab(ctx, d) {
  const { catalog } = ctx;
  let list = [...d.stats.values()].filter((s) => catalog.skills.has(s.skillId));
  if (ui.filter === "earned") list = list.filter((s) => s.latest >= EARNED_AT);
  if (ui.filter === "learning") list = list.filter((s) => s.latest < EARNED_AT);
  list.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  const chip = (key, label) => html`<button class="chip" type="button" data-action="filter" data-f="${key}" aria-pressed="${ui.filter === key}">${label}</button>`;
  return html`
    <div class="cluster" role="group" aria-label="Show">${chip("all", "All")}${chip("learning", "Learning")}${chip("earned", "Earned")}</div>
    ${list.length
      ? html`<div class="card">${list.map((s) => {
          const sk = catalog.skills.get(s.skillId);
          const pct = landedPct(s);
          return html`<div class="row row--pick" role="button" tabindex="0" data-action="skill" data-id="${s.skillId}">${catDot(sk.cat)}<span class="grow">${sk.name}<br><span class="dim">${levelLabel(catalog, sk.levelKey)}, last ${fmtDate(s.lastDate, { month: "short", day: "numeric" })}</span></span>${pct !== null ? html`<span class="chip chip--tag">${pct}% landed</span>` : ""}${miniSkates(s.latest)}</div>`;
        })}</div>`
      : html`<section class="card"><p class="dim">${ui.filter === "all" ? "Skills show up here after your first session." : "Nothing here yet."}</p></section>`}`;
}

function sessionsTab(ctx, d) {
  const list = [...ctx.state.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (!list.length) return html`<section class="card"><p class="dim">No sessions yet. Plan one and get on the ice.</p></section>`;
  return html`<div class="stack">${list.map((s) => {
    const xp = d.xp.bySession.get(s.id);
    const open = ui.open === s.id;
    return html`<section class="card">
      <button class="sess-head" type="button" data-action="open-session" data-id="${s.id}" aria-expanded="${open}">
        <span class="grow"><strong>${fmtDate(s.date, { weekday: "long", month: "long", day: "numeric" })}</strong><br><span class="dim">${fmtMinutes(s.onIceSec / 60)} on ice of ${fmtMinutes(s.bookedMin)}, ${s.entries.length} ${s.entries.length === 1 ? "skill" : "skills"}</span></span>
        ${xp ? html`<span class="chip chip--gold">+${xp.xp} XP</span>` : ""}
      </button>
      ${open
        ? html`<div class="sess-body">
            ${s.entries.map((e) => {
              const sk = ctx.catalog.skills.get(e.skillId);
              return html`<div class="row">${catDot(sk ? sk.cat : "skills")}<span class="grow">${sk ? sk.name : e.skillId}${e.note ? html`<br><span class="dim">${e.note}</span>` : ""}</span>${e.attempts ? html`<span class="chip chip--tag">${e.landed}/${e.attempts}</span>` : ""}${e.stars ? miniSkates(e.stars) : ""}</div>`;
            })}
            ${s.note ? html`<p class="note">${s.note}</p>` : ""}
            <button class="chip chip--discard" type="button" data-action="delete-session" data-id="${s.id}">Delete this session</button>
          </div>`
        : ""}
    </section>`;
  })}</div>`;
}

export function renderProgress(ctx) {
  const d = ctx.derive();
  const body = ui.tab === "overview" ? overview(ctx, d) : ui.tab === "skills" ? skillsTab(ctx, d) : sessionsTab(ctx, d);
  return html`
    <header class="screen-head"><div><p class="eyebrow">Look how far you have come</p><h1>Progress</h1></div></header>
    <div class="seg" role="group" aria-label="Section">${TABS.map(([key, label]) => html`<button type="button" data-action="ptab" data-tab="${key}" aria-pressed="${ui.tab === key}">${label}</button>`)}</div>
    ${body}`;
}

function sparkline(history) {
  const rated = history.filter((h) => h.stars > 0);
  if (rated.length < 2) return rated.length === 1 ? html`<p class="dim">Rated once so far: ${rated[0].stars} ${rated[0].stars === 1 ? "skate" : "skates"}. Rate it again next time to see a trend.</p>` : "";
  const w = 240;
  const h = 70;
  const pts = rated.map((r, i) => [8 + (i / (rated.length - 1)) * (w - 16), h - 8 - ((r.stars - 1) / 4) * (h - 16)]);
  const line = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#ffd98a"/>`).join("");
  return html`<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Rating over time, from ${rated[0].stars} to ${rated[rated.length - 1].stars} skates"><polyline points="${line}" fill="none" stroke="#a6f1ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${raw(dots)}</svg>`;
}

function openSkill(ctx, id) {
  const d = ctx.derive();
  const sk = ctx.catalog.skills.get(id);
  const st = d.stats.get(id);
  const inPlan = ctx.state.plan.skillIds.includes(id);
  const pct = landedPct(st);
  const sheet = openSheet(
    html`<p class="eyebrow">${catName(sk.cat)} · ${levelLabel(ctx.catalog, sk.levelKey)}</p>
      <h2 class="sheet__title sheet__title--small">${sk.name}</h2>
      ${st
        ? html`<div class="stats">
            <div><p class="num stat-n">${st.latest || "–"}</p><p class="dim">latest</p></div>
            <div><p class="num stat-n">${st.best || "–"}</p><p class="dim">best</p></div>
            <div><p class="num stat-n">${st.count}</p><p class="dim">${st.count === 1 ? "session" : "sessions"}</p></div>
            ${pct !== null ? html`<div><p class="num stat-n">${pct}%</p><p class="dim">landed</p></div>` : ""}
          </div>
          ${sparkline(st.history)}`
        : html`<p class="dim">Not tried yet.</p>`}
      <label class="field"><span>My cues</span><textarea class="input note-input" id="cue" rows="3" maxlength="1000" placeholder="Reminders from you or your coach, like: eyes up, arms in front">${ctx.state.cues[id] || ""}</textarea></label>
      <div class="placeholder">3D reference<br>coming soon</div>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" id="plan-toggle">${inPlan ? "Remove from plan" : "Add to plan"}</button><button class="btn btn--small" type="button" data-close="done">Done</button></div>`,
    { label: sk.name }
  );
  const cue = $("#cue", sheet.dialog);
  cue.addEventListener("input", () => {
    if (cue.value.trim()) ctx.state.cues[id] = cue.value.slice(0, 1000);
    else delete ctx.state.cues[id];
    ctx.save();
  });
  $("#plan-toggle", sheet.dialog).addEventListener("click", (e) => {
    ctx.togglePlan(id);
    e.target.textContent = ctx.state.plan.skillIds.includes(id) ? "Remove from plan" : "Add to plan";
  });
}

export function progressActions(ctx) {
  return {
    ptab: (el) => {
      ui.tab = el.dataset.tab;
      ctx.update();
    },
    filter: (el) => {
      ui.filter = el.dataset.f;
      ctx.update();
    },
    skill: (el) => openSkill(ctx, el.dataset.id),
    "open-session": (el) => {
      ui.open = ui.open === el.dataset.id ? null : el.dataset.id;
      ctx.update();
    },
    "delete-session": async (el) => {
      const ok = await confirmSheet({ title: "Delete this session?", message: "Its time, ratings, and XP are removed. This cannot be undone, so save a backup first if you are unsure.", confirmLabel: "Delete" });
      if (!ok) return;
      ctx.state.sessions = ctx.state.sessions.filter((s) => s.id !== el.dataset.id);
      ui.open = null;
      ctx.save();
      ctx.syncIce({});
      ctx.update();
      toast("Session deleted.");
    },
  };
}
