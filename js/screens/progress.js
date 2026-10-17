/* Progress: totals, levels, every skill you have tried, and every session. */

import { html, raw, fmtMinutes, fmtDate, fmt1, addDays, weekKey, todayISO } from "../util.js";
import { catDot, catName, miniSkates, bar, medallion, medal, icon } from "../ui/parts.js";
import { openSheet, confirmSheet, toast, $ } from "../ui/dom.js";
import { levelProgress, landedPct, minutesOnIce, EARNED_AT } from "../stats.js";
import { nextLevelKey, levelLabel } from "../catalog.js";
import { fmtMoney, costSummary, costByMonth, sanitizeCost } from "../cost.js";
import { GROUPS, badgeRatio, progressText } from "../badges.js";
import { shareBadge, shareCardLink, shareCardPicture, copyCardLink } from "../ui/share.js";
import { board, parseFriendInput } from "../friends.js";
import { initials, openFriend, openAddFriend } from "../ui/friends.js";
import { testList, skillsReadiness, freeReadiness, countdown, readinessLabel, skillsToWorkOn } from "../testprep.js";

const ui = { tab: "overview", open: null, filter: "all", board: "week", changeTest: false };

const TABS = [
  ["overview", "Overview"],
  ["badges", "Badges"],
  ["friends", "Friends"],
  ["tests", "Tests"],
  ["skills", "Skills"],
  ["sessions", "Sessions"],
];

/* Open Progress on the trophy case (used by the Badges tile on Home). */
export function showBadges() {
  ui.tab = "badges";
}

/* Open Progress on test readiness (used by the Test tile on Home). */
export function showTests() {
  ui.tab = "tests";
  ui.changeTest = false;
}

/* Open Progress on the friends board (used by the Friends tile on Home and by a friend's link). */
export function showFriends() {
  ui.tab = "friends";
}

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

/* What the ice costs: this month, per session, per hour, and the last six months. Sessions without a cost are left out of every number. */
function costCard(ctx, d) {
  const { sessions } = ctx.state;
  if (!sessions.length) return "";
  const sum = costSummary(sessions, d.today);
  if (!sum.all.costed) {
    return html`<section class="card tile"><div class="tile__head"><p class="eyebrow">Ice cost</p></div><p class="dim">Add what the ice cost when you save a session, or set your usual cost in Me. MySkate adds it up by month and works out the cost per hour.</p></section>`;
  }
  /* Months with no sessions are left out, except this one. */
  const months = costByMonth(sessions, d.today, 6).filter((m, i) => i === 0 || m.sessions > 0);
  const per = (n) => (n === null ? "–" : fmtMoney(n));
  return html`<section class="card tile wide" aria-labelledby="cost-title">
    <div class="tile__head"><p class="eyebrow" id="cost-title">Ice cost</p></div>
    <div class="stats">
      <div><p class="num stat-n">${sum.thisMonth.costed ? fmtMoney(sum.thisMonth.total) : "–"}</p><p class="dim">this month</p></div>
      <div><p class="num stat-n">${per(sum.all.perSession)}</p><p class="dim">per session</p></div>
      <div><p class="num stat-n">${per(sum.all.perHour)}</p><p class="dim">per hour on ice</p></div>
      <div><p class="num stat-n">${fmtMoney(sum.all.total)}</p><p class="dim">in all</p></div>
    </div>
    <div>${months.map((m) => html`<div class="row"><span class="grow">${fmtDate(m.month + "-01", { month: "long", year: "numeric" })}<br><span class="dim">${m.sessions ? `${m.sessions} ${m.sessions === 1 ? "session" : "sessions"}, ${fmt1(m.hours)} h` : "No sessions"}</span></span>${m.costed ? html`<span class="chip chip--gold">${fmtMoney(m.total)}</span><span class="chip chip--tag">${per(m.perHour)} an hour</span>` : m.sessions ? html`<span class="dim">no cost added</span>` : ""}</div>`)}</div>
    ${sum.all.unknown ? html`<p class="note">${sum.all.unknown} ${sum.all.unknown === 1 ? "session has" : "sessions have"} no cost, so ${sum.all.unknown === 1 ? "it is" : "they are"} left out. Add one from the Sessions tab.</p>` : ""}
  </section>`;
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
      ${costCard(ctx, d)}
      <section class="card tile wide">
        <div class="tile__head"><p class="eyebrow">Hours by week</p></div>
        ${weeklyChart(ctx, d)}
      </section>
      ${movers.length ? html`<section class="card tile"><div class="tile__head"><p class="eyebrow">Most improved</p></div>${movers.map((m) => html`<div class="row"><span class="grow">${catalog.skills.get(m.s.skillId).name}</span><span class="chip chip--gold">${m.from} to ${m.to}</span></div>`)}</section>` : ""}
    </div>`;
}

function trophy(b) {
  const label = b.earned ? `earned ${fmtDate(b.earnedOn)}` : `${progressText(b)}, not earned yet`;
  return html`<button class="trophy ${b.earned ? "is-earned" : ""}" type="button" data-action="badge" data-id="${b.id}" aria-label="${b.name}, ${label}">
    ${medal(b, { locked: !b.earned })}
    <span class="trophy__name">${b.name}</span>
    ${b.earned ? html`<span class="trophy__sub">${fmtDate(b.earnedOn, { month: "short", day: "numeric" })}</span>` : html`<span class="trophy__sub">${progressText(b)}</span><span class="trophy__bar" aria-hidden="true"><i style="width:${Math.round(badgeRatio(b) * 100)}%"></i></span>`}
  </button>`;
}

/* The trophy case: how many badges, the ones closest to done, and every badge by group. */
function badgesTab(ctx) {
  const list = ctx.badges();
  const earned = list.filter((b) => b.earned).length;
  const next = list.filter((b) => !b.earned && badgeRatio(b) > 0).sort((a, b) => badgeRatio(b) - badgeRatio(a)).slice(0, 3);
  return html`<div class="tiles">
    <section class="card card--glow tile">
      <div class="tile__head"><p class="eyebrow">Trophy case</p></div>
      <div class="hours"><span class="num">${earned}</span><span class="dim">of ${list.length} badges earned</span></div>
      ${bar({ pct: (earned / list.length) * 100, label: "Badges earned" })}
      ${earned ? "" : html`<p class="note">Save a session and your first badge is waiting.</p>`}
    </section>
    ${next.length
      ? html`<section class="card tile"><div class="tile__head"><p class="eyebrow">Almost there</p></div>${next.map((b) => html`<button class="row row--btn" type="button" data-action="badge" data-id="${b.id}">${medal(b, { locked: true })}<span class="grow">${b.name}<br><span class="dim">${progressText(b)}</span></span></button>`)}</section>`
      : ""}
    ${GROUPS.map((g) => html`<section class="card tile wide"><div class="tile__head"><p class="eyebrow">${g}</p></div><div class="trophies">${list.filter((b) => b.group === g).map(trophy)}</div></section>`)}
  </div>`;
}

/* You and your friends ranked by XP, your own card to send, and a place to add a friend from a link. */
function friendsTab(ctx) {
  const { state } = ctx;
  const me = ctx.myCard();
  const rows = board({ me, friends: state.friends, period: ui.board });
  const row = (r) => {
    const body = html`<span class="rank num" aria-label="Place ${r.rank}">${r.rank}</span><span class="avatar" aria-hidden="true">${initials(r.name)}</span><span class="grow">${r.name}${r.you ? " (you)" : ""}<br><span class="dim">Level ${r.level} · ${r.streak} ${r.streak === 1 ? "week" : "weeks"} in a row · ${r.badges} ${r.badges === 1 ? "badge" : "badges"}</span></span><span class="chip chip--gold">${r.xp} XP</span>`;
    return r.you ? html`<div class="row row--you">${body}</div>` : html`<button class="row row--btn" type="button" data-action="friend" data-id="${r.id}">${body}</button>`;
  };
  return html`<div class="tiles">
    <section class="card card--glow tile wide" aria-labelledby="board-title">
      <div class="tile__head"><p class="eyebrow" id="board-title">Friends board</p>
        <div class="seg" role="group" aria-label="Period"><button type="button" data-action="board" data-p="week" aria-pressed="${ui.board === "week"}">Last 7 days</button><button type="button" data-action="board" data-p="all" aria-pressed="${ui.board === "all"}">All time</button></div></div>
      <div>${rows.map(row)}</div>
      ${state.friends.length
        ? html`<p class="note">A friend's numbers are from the day their card was made. Ask them for a fresh card to update them.</p>`
        : html`<p class="dim">No friends yet. Send your card to a friend below, and add theirs when they send it back. Everyone's numbers stay on their own device: a card holds only a name, level, XP, streak, badge count, and hours.</p>`}
    </section>
    <section class="card tile" aria-labelledby="card-title">
      <div class="tile__head"><p class="eyebrow" id="card-title">Your card</p></div>
      <div class="friend-head"><span class="avatar" aria-hidden="true">${initials(me.name)}</span><div><strong>${me.name}</strong><br><span class="dim">Level ${me.level} · ${me.xpTotal} XP · ${me.badges} ${me.badges === 1 ? "badge" : "badges"}</span></div></div>
      ${state.profile.name.trim() ? "" : html`<p class="note">Your card says "Skater". Add your name in Me to put it on the card.</p>`}
      <div class="cluster"><button class="btn btn--small" type="button" data-action="share-card">Share my card</button><button class="btn btn--glass btn--small" type="button" data-action="card-picture">Save as a picture</button><button class="chip" type="button" data-action="copy-card">Copy link</button></div>
      <p class="note">Your friend opens the link on their phone and taps Add. The link keeps your card after the # in the address, so it is never sent to any website.</p>
    </section>
    <section class="card tile" aria-labelledby="add-title">
      <div class="tile__head"><p class="eyebrow" id="add-title">Add a friend</p></div>
      <p class="dim">Open the link your friend sent you, or paste it here.</p>
      <label class="field"><span class="sr-only">A friend's link</span><input class="input" id="friend-code" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste a friend's link"></label>
      <button class="btn btn--glass btn--small" type="button" data-action="add-friend">Add friend</button>
    </section>
  </div>`;
}

/* Choose the test you are working toward, and its date if you have one. */
function testChooser(ctx, tests, current) {
  const goal = ctx.state.profile.test;
  const option = (t) => html`<option value="${t.id}" ${goal && goal.id === t.id ? "selected" : ""}>${t.name}</option>`;
  return html`<section class="card card--glow tile stack">
    <div class="tile__head"><p class="eyebrow">Test readiness</p></div>
    <h2>Which test are you working toward?</h2>
    <p class="dim">MySkate keeps score on the skating skills for that test from your ratings, and gives you a checklist for the free skate part to tick off yourself.</p>
    <label class="field"><span>Test</span><select class="input" id="test-pick"><optgroup label="Standard and Skate United">${tests.filter((t) => !t.adult).map(option)}</optgroup><optgroup label="Adult">${tests.filter((t) => t.adult).map(option)}</optgroup></select></label>
    <label class="field"><span>Test date (optional)</span><input class="input" id="test-date" type="date" min="${todayISO()}" value="${goal && goal.date ? goal.date : ""}"></label>
    <p class="status status--warn" role="alert" hidden></p>
    <div class="cluster"><button class="btn" type="button" data-action="save-test">Start tracking</button>${current ? html`<button class="btn btn--glass" type="button" data-action="cancel-test">Cancel</button>` : ""}</div>
  </section>`;
}

function ring(pct, label) {
  return html`<div class="ring" style="--v:${pct}" role="img" aria-label="${label}"><b>${pct}%</b></div>`;
}

/* Where you stand for the test you chose: the skating skills (from your ratings) and the free skate checklist (your ticks). */
function testsTab(ctx, d) {
  const { state, catalog } = ctx;
  const tests = testList(catalog);
  const goal = state.profile.test && tests.find((t) => t.id === state.profile.test.id);
  if (!goal || ui.changeTest) return testChooser(ctx, tests, goal);
  const skills = skillsReadiness(catalog, goal.levelKey, d.stats);
  const free = freeReadiness(goal.free, state.testChecks);
  const cd = countdown(state.profile.test.date, d.today);
  const todo = skillsToWorkOn(skills);
  const note = catalog.freeTests && catalog.freeTests.note;
  return html`<div class="tiles">
    <section class="card card--glow tile wide" aria-labelledby="test-title">
      <div class="tile__head"><p class="eyebrow" id="test-title">Working toward</p><button class="chip" type="button" data-action="change-test">Change test</button></div>
      <div class="split"><h2>${goal.name}${goal.free ? html` <span class="dim">free skate up to ${goal.free.maxTime}</span>` : ""}</h2>${cd ? html`<span class="chip ${cd.days < 0 ? "chip--coral" : "chip--gold"}">${cd.label}</span>` : ""}</div>
      ${cd ? html`<p class="dim">${fmtDate(state.profile.test.date, { weekday: "long", month: "long", day: "numeric" })}</p>` : html`<p class="dim">No date set. Change test to add one.</p>`}
      <div class="rings">
        <div class="ring-box">${ring(skills.pct, `Skating skills ${skills.pct} percent`)}<p><strong>Skating skills</strong><br><span class="dim">${skills.earned} of ${skills.total} earned · ${readinessLabel(skills.pct)}</span></p></div>
        ${free.total ? html`<div class="ring-box">${ring(free.pct, `Free skate ${free.pct} percent`)}<p><strong>Free skate</strong><br><span class="dim">${free.done} of ${free.total} ticked · ${readinessLabel(free.pct)}</span></p></div>` : ""}
      </div>
    </section>
    <section class="card tile" aria-labelledby="ss-title">
      <div class="tile__head"><p class="eyebrow" id="ss-title">Skating skills</p><span class="chip chip--on">${skills.earned} of ${skills.total}</span></div>
      <div>${skills.rows.map((r) => html`<div class="row row--pick" role="button" tabindex="0" data-action="skill" data-id="${r.skillId}"><span class="tick" aria-hidden="true" data-on="${r.earned}">${icon("check")}</span><span class="grow">${r.name}<br><span class="dim">${r.tried ? `Latest ${r.latest} ${r.latest === 1 ? "skate" : "skates"}, best ${r.best}` : "Not tried yet"}</span></span>${r.recent.length ? html`<span class="pips pips--mini" role="img" aria-label="Last ratings: ${r.recent.join(", ")}">${r.recent.map((n) => html`<i class="pip ${n >= EARNED_AT ? "on" : ""}"></i>`)}</span>` : ""}</div>`)}</div>
      ${todo.length ? html`<button class="btn btn--glass btn--small" type="button" data-action="plan-test">Plan the ${todo.length} not earned</button>` : html`<p class="note">Every skating skill for this test is earned. Keep them fresh before test day.</p>`}
    </section>
    ${goal.free
      ? html`<section class="card tile" aria-labelledby="fs-title">
          <div class="tile__head"><p class="eyebrow" id="fs-title">Free skate checklist</p><span class="chip chip--on">${free.done} of ${free.total}</span></div>
          ${goal.free.also ? html`<p class="note">${goal.free.also}</p>` : ""}
          ${free.groups.map((g) => html`<p class="eyebrow">${g.group}</p><div>${g.items.map((i) => html`<div class="row row--pick" role="checkbox" tabindex="0" aria-checked="${i.done}" data-action="test-check" data-id="${i.id}"><span class="tick" aria-hidden="true">${icon("check")}</span><span class="grow">${i.text}</span></div>`)}</div>`)}
          <p class="note">Tick a requirement when you can do it every time. ${note || ""}</p>
        </section>`
      : ""}
  </div>`;
}

function openBadge(ctx, id) {
  const b = ctx.badges().find((x) => x.id === id);
  if (!b) return;
  const took = b.sessionsTaken > 0 ? `It took ${b.sessionsTaken} ${b.sessionsTaken === 1 ? "session" : "sessions"}${b.daysTaken > 1 ? ` over ${b.daysTaken} days` : ""}.` : "";
  const sheet = openSheet(
    html`<div class="badge-sheet">
      ${medal(b, { locked: !b.earned, xl: true })}
      <h2 class="sheet__title sheet__title--small">${b.name}</h2>
      <p class="note">${b.text}</p>
      ${b.earned
        ? html`<p><strong>Earned ${fmtDate(b.earnedOn, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong></p>${took ? html`<p class="dim">${took}</p>` : ""}`
        : html`${bar({ pct: badgeRatio(b) * 100, label: `${b.name} progress` })}<p class="dim">${progressText(b)}</p>`}
    </div>
    <div class="sheet__foot">${b.earned ? html`<button class="btn btn--glass btn--small" type="button" id="badge-share">Share</button>` : html`<span></span>`}<button class="btn btn--small" type="button" data-close="done">Done</button></div>`,
    { label: b.name }
  );
  const share = $("#badge-share", sheet.dialog);
  if (share) share.addEventListener("click", () => shareBadge(b, ctx.state.profile.name));
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
        ${s.cost !== null && s.cost !== undefined ? html`<span class="chip chip--tag">${fmtMoney(s.cost)}</span>` : ""}
        ${xp ? html`<span class="chip chip--gold">+${xp.xp} XP</span>` : ""}
      </button>
      ${open
        ? html`<div class="sess-body">
            ${s.entries.map((e) => {
              const sk = ctx.catalog.skills.get(e.skillId);
              return html`<div class="row">${catDot(sk ? sk.cat : "skills")}<span class="grow">${sk ? sk.name : e.skillId}${e.note ? html`<br><span class="dim">${e.note}</span>` : ""}</span>${e.attempts ? html`<span class="chip chip--tag">${e.landed}/${e.attempts}</span>` : ""}${e.stars ? miniSkates(e.stars) : ""}</div>`;
            })}
            ${s.note ? html`<p class="note">${s.note}</p>` : ""}
            <div class="row"><span class="grow">Ice cost${s.cost !== null && s.cost !== undefined ? html`: <strong>${fmtMoney(s.cost)}</strong>` : html`<br><span class="dim">Not added</span>`}</span><button class="chip" type="button" data-action="edit-cost" data-id="${s.id}">${s.cost !== null && s.cost !== undefined ? "Change" : "Add a cost"}</button></div>
            <button class="chip chip--discard" type="button" data-action="delete-session" data-id="${s.id}">Delete this session</button>
          </div>`
        : ""}
    </section>`;
  })}</div>`;
}

export function renderProgress(ctx) {
  const d = ctx.derive();
  const body = ui.tab === "overview" ? overview(ctx, d) : ui.tab === "badges" ? badgesTab(ctx) : ui.tab === "friends" ? friendsTab(ctx) : ui.tab === "tests" ? testsTab(ctx, d) : ui.tab === "skills" ? skillsTab(ctx, d) : sessionsTab(ctx, d);
  return html`
    <header class="screen-head"><div><p class="eyebrow">Look how far you have come</p><h1>Progress</h1></div></header>
    <div class="seg seg--scroll" role="group" aria-label="Section">${TABS.map(([key, label]) => html`<button type="button" data-action="ptab" data-tab="${key}" aria-pressed="${ui.tab === key}">${label}</button>`)}</div>
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
    badge: (el) => openBadge(ctx, el.dataset.id),
    "change-test": () => {
      ui.changeTest = true;
      ctx.update();
    },
    "cancel-test": () => {
      ui.changeTest = false;
      ctx.update();
    },
    "save-test": () => {
      const id = $("#test-pick").value;
      const date = $("#test-date").value;
      if (date && date < todayISO()) {
        const warn = $(".status--warn");
        warn.textContent = "That date has passed. Pick today or later, or leave it empty.";
        warn.hidden = false;
        return;
      }
      ctx.state.profile.test = { id, date: date || "" };
      ui.changeTest = false;
      ctx.save();
      ctx.update();
    },
    "test-check": (el) => {
      const checks = ctx.state.testChecks;
      if (checks[el.dataset.id]) delete checks[el.dataset.id];
      else checks[el.dataset.id] = true;
      ctx.save();
      ctx.update();
    },
    "plan-test": () => {
      const goal = testList(ctx.catalog).find((t) => t.id === ctx.state.profile.test.id);
      const todo = skillsToWorkOn(skillsReadiness(ctx.catalog, goal.levelKey, ctx.derive().stats));
      const before = ctx.state.plan.skillIds.length;
      todo.filter((id) => !ctx.state.plan.skillIds.includes(id)).forEach((id) => ctx.state.plan.skillIds.length < 20 && ctx.state.plan.skillIds.push(id));
      ctx.save();
      const added = ctx.state.plan.skillIds.length - before;
      toast(added ? `Added ${added} ${added === 1 ? "skill" : "skills"} to your plan.` : "They are already in your plan.");
      ctx.go("plan");
    },
    board: (el) => {
      ui.board = el.dataset.p;
      ctx.update();
    },
    friend: (el) => openFriend(ctx, el.dataset.id),
    "share-card": () => shareCardLink(ctx.myCard()),
    "card-picture": () => shareCardPicture(ctx.myCard()),
    "copy-card": () => copyCardLink(ctx.myCard()),
    "add-friend": () => {
      const input = $("#friend-code");
      const card = parseFriendInput(input ? input.value : "");
      if (!card) return toast("That does not look like a friend's link. Ask them to send it again.", 4500);
      openAddFriend(ctx, card);
    },
    "open-session": (el) => {
      ui.open = ui.open === el.dataset.id ? null : el.dataset.id;
      ctx.update();
    },
    "edit-cost": (el) => {
      const session = ctx.state.sessions.find((x) => x.id === el.dataset.id);
      if (!session) return;
      const sheet = openSheet(
        html`<h2 class="sheet__title sheet__title--small">What did this ice cost?</h2>
          <p class="note">${fmtDate(session.date, { weekday: "long", month: "long", day: "numeric" })}. Leave it empty if you do not know. Free ice is 0.</p>
          <label class="field"><span>Cost</span><input class="input input--num" id="cost-in" type="number" inputmode="decimal" min="0" max="999" step="0.5" value="${session.cost ?? ""}" placeholder="18"></label>
          <p class="status status--warn" role="alert" hidden></p>
          <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="cost-save">Save</button></div>`,
        { label: "Ice cost" }
      );
      const input = $("#cost-in", sheet.dialog);
      input.focus();
      $("#cost-save", sheet.dialog).addEventListener("click", () => {
        const text = input.value.trim();
        const cost = sanitizeCost(text);
        if (text !== "" && cost === null) {
          const warn = $(".status--warn", sheet.dialog);
          warn.textContent = "Enter an amount from 0 to 999.";
          warn.hidden = false;
          return;
        }
        session.cost = cost;
        ctx.save();
        sheet.close("saved");
        ctx.update();
      });
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
