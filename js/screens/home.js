/* Home: your week as a figure eight, your streak, your level, your blades, and what to do next. */

import { html, fmtMinutes, fmtDate, fmtNum, fmt1, fmtClock, fmtDuration, fmtDurationShort, durationParts, todayISO, daysBetween, addDays } from "../util.js";
import { icon, medal, bar, bladeArt, skateSvg, timeNum } from "../ui/parts.js";
import { eightSvg } from "../ui/eight.js";
import { weekEight, streakEights, weekStubs } from "../week.js";
import { showBadges, showFriends, showTests } from "./progress.js";
import { testList, skillsReadiness, freeReadiness, countdown } from "../testprep.js";
import { board } from "../friends.js";
import { avatar } from "../ui/friends.js";
import { badgeRatio, progressText } from "../badges.js";
import { bladeInfo, bladeHours, lifetimeSeconds, setBladeHours, setLifetimeHours, logSharpening, LIFETIME_MAX } from "../blades.js";
import { levelProgress, suggestNext, isSkating, isAir, EARNED_AT } from "../stats.js";
import { levelLabel } from "../catalog.js";
import { confirmSheet, toast, $ } from "../ui/dom.js";
import { twinkle } from "../ui/celebrate.js";
import { elapsedMs } from "../timer.js";
import { upcomingPicks, kindName, fmtRange, fmtTime } from "../ice.js";
import { costSummary, fmtMoney } from "../cost.js";
import { sortedGoals } from "../goals.js";
import { sortedHomework } from "../homework.js";
import { offIceSummary } from "../office.js";
import { openOffIceSheet } from "../ui/officesheet.js";
import { nextEvent, daysUntil, countdownText, programStatus, roman, seasonLabel } from "../compete.js";

const ui = { bladeOpen: false, eightKey: null };
const LIMITS = [20, 25, 30, 35];

/* What tapping the figure eight does, and what its open loop says. */
function eightCall(state) {
  if (state.active) return { action: "go-skate", title: "Back to the ice", tiny: "On the ice", go: "BACK ON" };
  if (state.plan.skillIds.length) return { action: "start", title: "Start your session", tiny: "Your turn", go: "STEP ON" };
  return { action: "go-plan", title: "Plan a session", tiny: "Your turn", go: "PLAN IT" };
}

/* Your next starred ice time, as a ticket with a tear-off stub. Only shown once you have picked one. */
function ticket(ctx, d) {
  const { state } = ctx;
  if (!state.rinks.length) return "";
  const next = upcomingPicks(state.iceSessions, new Date(), 1)[0];
  if (!next) return "";
  const rink = state.rinks.find((r) => r.id === next.rinkId);
  const tomorrow = addDays(d.today, 1);
  const day = next.date === d.today ? "Today" : next.date === tomorrow ? "Tomorrow" : fmtDate(next.date, { weekday: "long" });
  return html`<button class="ticket" type="button" data-action="go-ice" aria-label="Your next ice: ${day} at ${fmtTime(next.start)}, ${kindName(next.kind)}${rink ? " at " + rink.name : ""}. Open the ice week.">
    <span class="ticket__main"><small>Admit one · ${kindName(next.kind)}</small><b>${day}<br>${fmtTime(next.start)}</b>${rink ? html`<span>${rink.name}</span>` : ""}</span>
    <span class="ticket__stub"><span><small>Level</small><b>${d.level.level}</b></span><i class="barcode" aria-hidden="true"></i></span>
  </button>`;
}

/* What the main button does, and says. */
function takeTheIce(ctx) {
  const { state } = ctx;
  const call = eightCall(state);
  const label = state.active ? "Back on the ice" : state.plan.skillIds.length ? "Start session" : "Plan the session";
  return html`<button class="btn home__go" type="button" data-action="${call.action}"><span>${label}</span>${icon("right")}</button>`;
}

/* Your next move: the one dark card on Home, with the one button that does the next thing, so there is never a question of where to go. */
function nextMove(ctx) {
  const { state } = ctx;
  let title;
  let line;
  if (state.active) {
    title = "You are on the ice";
    line = `${fmtClock(elapsedMs(state.active) / 1000)} so far of ${fmtMinutes(state.active.bookedMin)}. ${state.active.running ? "The clock is running." : "The clock is paused."}`;
  } else if (state.plan.skillIds.length) {
    const n = state.plan.skillIds.length;
    title = "Ready to skate";
    line = `${n} ${n === 1 ? "skill" : "skills"} planned for ${fmtMinutes(state.plan.slotMin)}. Tap Start session when you step on the ice.`;
  } else {
    const next = state.rinks.length ? upcomingPicks(state.iceSessions, new Date(), 1)[0] : null;
    const rink = next && state.rinks.find((r) => r.id === next.rinkId);
    const day = next ? (next.date === todayISO() ? "today's" : `${fmtDate(next.date, { weekday: "long" })}'s`) : "";
    title = next ? `Plan ${day} session` : "Plan your next session";
    line = next ? `${kindName(next.kind)}${rink ? " at " + rink.name : ""}, ${fmtTime(next.start)}. Pick what to work on.` : "Pick a few skills to work on, then take them to the ice.";
  }
  return html`<section class="nextmove" aria-labelledby="next-title">
    <p class="kicker">Your next move</p>
    <h2 id="next-title">${title}</h2>
    <p class="nextmove__line">${line}</p>
    ${takeTheIce(ctx)}
  </section>`;
}

/* The program sheet: what you are skating tonight (your plan), or what MySkate suggests when you have not planned yet. */
function protocol(ctx, d) {
  const { state, catalog } = ctx;
  const planned = state.plan.skillIds.filter((id) => catalog.skills.has(id));
  const picks = planned.length ? planned.map((skillId) => ({ skillId })) : suggestNext(state, catalog, d.stats, d.today, 3);
  if (!picks.length) return "";
  const rows = picks.slice(0, 4).map((p, i) => {
    const st = d.stats.get(p.skillId);
    const goal = state.goals.find((g) => g.skillId === p.skillId);
    return html`<tr class="${i === 0 && !planned.length ? "hot" : ""}"><td>${roman(i + 1)}.</td><td>${catalog.skills.get(p.skillId).name}</td><td class="n">${st ? st.latest || "–" : "–"}</td><td class="n">${goal ? goal.target : EARNED_AT}</td></tr>`;
  });
  const more = picks.length - rows.length;
  return html`<section class="protocol" aria-label="${planned.length ? "Tonight's plan" : "Suggested skills"}">
    <div class="protocol__hdr"><b>Practice list</b><span>${planned.length ? "Tonight's plan" : "Suggested for you"}</span></div>
    <table><thead><tr><th></th><th>Element</th><th>Last</th><th>Goal</th></tr></thead><tbody>${rows}</tbody></table>
    ${more > 0 ? html`<p class="protocol__more">and ${more} more</p>` : ""}
    <p class="protocol__foot">${planned.length ? html`${planned.length} ${planned.length === 1 ? "skill" : "skills"} for ${fmtMinutes(state.plan.slotMin)}. <button class="protocol__link" type="button" data-action="go-plan">Edit plan</button>` : html`Or pick your own on the <button class="protocol__link" type="button" data-action="go-plan">Plan</button> tab.`}</p>
  </section>`;
}

/* This week: the figure eight, a line about it, the streak, and a stub for each day. */
function weekSection(ctx, d, week, animate) {
  const { state } = ctx;
  const call = eightCall(state);
  const more = week.needed - week.count;
  const caption = state.active
    ? `${fmtClock(elapsedMs(state.active) / 1000)} on ice of ${fmtMinutes(state.active.bookedMin)}. ${state.active.running ? "Running." : "Paused."}`
    : week.complete
      ? "The eight is whole. Streak secured for this week."
      : more === 1
        ? "One more session closes your eight."
        : `${more} more sessions close your eight.`;
  const items = streakEights(d.streak.weeks, week.complete);
  const streakText = d.streak.weeks > 0 ? `${d.streak.weeks} ${d.streak.weeks === 1 ? "week" : "weeks"} in a row` : `Skate ${week.needed} times in a week to start a streak`;
  const stubs = weekStubs(state.sessions, d.today);
  return html`<section class="home__eight" aria-label="This week">
    <p class="cp-label">This week</p>
    <button class="eight" type="button" data-action="${call.action}" aria-label="${call.title}. This week: ${week.count} of ${week.needed} sessions.">${eightSvg(week, call, animate)}</button>
    <p class="home__caption ${week.complete && !state.active ? "is-whole" : ""}">${caption}</p>
    <div class="streak"><span class="streak__eights" aria-hidden="true">${items.map((k) => icon("eight", `ic--eight is-${k}`))}</span><span>${streakText}</span></div>
    <div class="stubs" role="img" aria-label="This week: ${stubs.filter((x) => x.done).length} days skated">${stubs.map((x) => html`<span class="st${x.done ? "" : " is-off"}${x.today ? " is-today" : ""}">${x.done ? x.day : x.letter}</span>`)}</div>
    ${!state.sessions.length ? html`<div class="cluster"><button class="chip" type="button" data-action="tour">How MySkate works</button></div>` : ""}
  </section>`;
}

/* Your progress at a glance: badges (with the way into the trophy case), all time on your skates, and the skill to try next. Each line
   has a small colored icon for its job: gold is earned, blue is learning. */
function progressList(ctx, d) {
  const list = ctx.badges();
  const earned = list.filter((b) => b.earned).length;
  const next = list.filter((b) => !b.earned && badgeRatio(b) > 0).sort((a, b) => badgeRatio(b) - badgeRatio(a))[0];
  const skill = suggestNext(ctx.state, ctx.catalog, d.stats, d.today, 1)[0];
  const skillName = skill && ctx.catalog.skills.get(skill.skillId).name;
  return html`<section class="card plist" aria-label="Your progress at a glance">
    <button class="prow" type="button" data-action="go-badges"><span class="prow__ic prow__ic--gold">${icon("star", "ic--fill")}</span><span class="grow"><b>${earned} of ${list.length} badges</b><small>${next ? `Next: ${next.name}, ${progressText(next)}` : "See every badge in the trophy case"}</small>${bar({ pct: list.length ? (earned / list.length) * 100 : 0, cls: "bar--gold", thin: true, label: "Badges earned" })}</span>${icon("right", "prow__go")}</button>
    <div class="prow"><span class="prow__ic">${icon("clock")}</span><span class="grow"><b>${fmtDuration(lifetimeSeconds(ctx.state))}</b><small>All time on these skates</small></span></div>
    ${skillName ? html`<button class="prow" type="button" data-action="go-plan"><span class="prow__ic">${icon("up")}</span><span class="grow"><b>${skillName}</b><small>Next up to work on</small></span>${icon("right", "prow__go")}</button>` : ""}
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
    <div class="hours"><span class="num" id="blade-hours">${timeNum(info.hours * 60)}</span><span class="dim">of <span id="blade-limit">${fmtNum(info.limit)}</span> hours before sharpening</span></div>
    ${bladeArt(info.pct)}
    <div class="split"><span class="chip ${info.tone === "due" ? "chip--coral" : info.tone === "dull" ? "chip--gold" : "chip--on"}" id="blade-state">${info.label}</span><span class="dim" id="blade-left"></span></div>
    ${bar({ pct: info.pct, cls: "bar--blade", thin: true, label: "Blade life used" })}
    <div class="alltime"><span class="eyebrow alltime__label">All time on these skates</span><span class="alltime__n" id="blade-all">${durationMarkup(lifetimeSeconds(ctx.state))}</span></div>
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
      <div class="field">
        <span id="all-label">Time on these skates in all</span>
        <div class="hm" role="group" aria-labelledby="all-label" aria-describedby="all-note">
          <input class="input input--num" id="h-all-h" type="number" inputmode="numeric" step="1" min="0" max="${LIFETIME_MAX}" value="${allHM(ctx.state).h}" data-input="blade-all" aria-label="Hours">
          <span class="dim">hrs</span>
          <input class="input input--num" id="h-all-m" type="number" inputmode="numeric" step="1" min="0" max="59" value="${allHM(ctx.state).m}" data-input="blade-all" aria-label="Minutes">
          <span class="dim">mins</span>
        </div>
      </div>
      <p class="note" id="all-note">The all-time total never starts over when you sharpen. MySkate adds your on-ice time after every session. If you skated before MySkate, put in the hours you know about.</p>
      <p class="note">Most skaters sharpen between 20 and 35 hours. Use what your coach or sharpener says. MySkate adds your on-ice time after every session.${last ? ` Last sharpened ${fmtDate(last.date, { month: "short", day: "numeric" })} at ${fmtMinutes(last.hours * 60)}.` : ""}</p>
    </div>
    <button class="btn btn--glass btn--small" type="button" data-action="blade-log">I just got them sharpened</button>
  </section>`;
}

/* Off-ice work this week. Only shown once you have logged some. */
function offIceTile(ctx, d) {
  if (!ctx.state.offIce.length) return "";
  const sum = offIceSummary(ctx.state.offIce, d.today);
  return html`<section class="card tile" aria-labelledby="off-title">
    <div class="tile__head"><p class="eyebrow" id="off-title">Off-ice this week</p></div>
    <div class="hours"><span class="num">${sum.weekMin}</span><span class="dim">minutes in ${sum.weekCount} ${sum.weekCount === 1 ? "workout" : "workouts"}</span></div>
    <button class="btn btn--glass btn--small" type="button" data-action="log-off">Log off-ice work</button>
  </section>`;
}

/* Coach homework still to do, soonest first. Only shown while there is some. */
function homeworkTile(ctx, d) {
  const open = sortedHomework(ctx.state.homework, d.today).filter((h) => !h.done);
  if (!open.length) return "";
  return html`<section class="card tile" aria-labelledby="hw-title">
    <div class="tile__head"><p class="eyebrow" id="hw-title">Coach homework</p><span class="chip chip--on">${open.length} open</span></div>
    <div>${open.slice(0, 3).map((h) => html`<div class="row"><span class="grow">${h.text}</span>${h.countdown ? html`<span class="chip ${h.overdue ? "chip--coral" : "chip--gold"}">${h.countdown.label}</span>` : ""}</div>`)}</div>
    <button class="btn btn--glass btn--small" type="button" data-action="go-plan">Open homework</button>
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
    <div>${rows.slice(0, 3).map((r) => html`<div class="row ${r.you ? "row--you" : ""}">${avatar(r.name, r.look)}<span class="grow">${r.name}${r.you ? " (you)" : ""}</span><span class="chip chip--gold">${r.xp} XP</span></div>`)}</div>
    <button class="btn btn--glass btn--small" type="button" data-action="go-friends">Open friends</button>
  </section>`;
}

/* How many badges, the latest ones, and the next one you are closest to. Only shown once there is a session or a badge. */
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

/* The next competition as a small marquee, with how much of its program is planned. With none yet, an invitation to plan one. */
function competeTile(ctx, d) {
  const { events, programs } = ctx.state;
  const ev = nextEvent(events, d.today);
  if (!ev) {
    return html`<section class="card tile" aria-labelledby="comp-title">
      <div class="tile__head"><p class="eyebrow" id="comp-title">Competition</p></div>
      <p class="dim">Planning for a competition? Lay your program out on the rink, set it to the music, and count down the days.</p>
      <button class="btn btn--glass btn--small" type="button" data-action="go-compete">${programs.length ? "Open competitions" : "Plan a competition"}</button>
    </section>`;
  }
  const days = daysUntil(ev.date, d.today);
  const prog = programs.find((p) => p.eventId === ev.id);
  const st = prog && programStatus(prog);
  return html`<section class="card tile cp-tile" aria-labelledby="comp-title">
    <div class="tile__head"><p class="eyebrow" id="comp-title">Next competition</p></div>
    <button class="cp-sign cp-bulbs" type="button" data-action="go-compete-event" data-id="${ev.id}"><h2>${ev.name}</h2><span class="cp-when">${fmtDate(ev.date, { weekday: "short", month: "short", day: "numeric" })}${ev.place ? " · " + ev.place : ""}</span><span class="cp-cd">${days > 1 ? html`${days}<span>days to go</span>` : countdownText(days)}</span></button>
    ${prog ? html`<p class="dim">${prog.name} · ${st.planned} of ${st.total} ${st.total === 1 ? "element" : "elements"} planned</p><div class="cp-bar" role="progressbar" aria-label="Program planned" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.total ? Math.round((st.planned / st.total) * 100) : 0}"><i style="width:${st.total ? (st.planned / st.total) * 100 : 0}%"></i></div>` : html`<p class="dim">No program attached yet.</p>`}
    <button class="btn btn--glass btn--small" type="button" data-action="go-compete">Open competitions</button>
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
  return html`<section class="card tile" aria-labelledby="week-title">
    <div class="tile__head"><p class="eyebrow" id="week-title">On the ice</p></div>
    <div class="hours"><span class="num">${timeNum(totals.weekMin)}</span><span class="dim">this week</span></div>
    <div class="stats">
      <div><p class="num stat-n">${streak.thisWeek}</p><p class="dim">${streak.thisWeek === 1 ? "session" : "sessions"} this week</p></div>
      <div><p class="num stat-n">${timeNum(totals.monthMin)}</p><p class="dim">this month</p></div>
      <div><p class="num stat-n">${timeNum(totals.allMin)}</p><p class="dim">in all</p></div>
    </div>
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
  const week = weekEight(ctx.state.sessions, d.today, d.streak.needed);
  /* The line is traced as you arrive, but only when the week has changed since it was last drawn, so ordinary updates stay calm. */
  const key = `${week.count}/${week.needed}`;
  const animate = ui.eightKey !== key;
  ui.eightKey = key;
  const L = d.level;
  return html`<div class="home">
    <div class="home__hero">
      <header class="band">
        <div class="band__date"><span>${fmtDate(d.today, { weekday: "long", month: "long", day: "numeric" })}</span><span>Season ${seasonLabel(d.today)}</span></div>
        <h1>${name ? `Hi, ${name}` : "Hi there"}</h1>
        <div class="band__lvl"><span>Level ${L.level} · ${levelLabel(ctx.catalog, ctx.state.profile.levels.skills)}</span></div>
        <div class="band__xp">${bar({ pct: L.pct, cls: "bar--band", thin: true, label: "XP to the next level" })}<span>${L.into} / ${L.need} XP</span></div>
      </header>
      ${nextMove(ctx)}
      <h2 class="group">Tonight</h2>
      ${weekSection(ctx, d, week, animate)}
      ${ticket(ctx, d)}
      ${protocol(ctx, d)}
      ${competeTile(ctx, d)}
    </div>
    <div class="home__rest">
      <h2 class="group">Your progress</h2>
      ${progressList(ctx, d)}
      <div class="tiles">${bladeTile(ctx)}${homeworkTile(ctx, d)}${goalsTile(ctx, d)}${testTile(ctx, d)}${offIceTile(ctx, d)}${friendsTile(ctx)}${iceTile(ctx, d)}${levelTiles(ctx, d)}${weekTile(ctx, d)}${costTile(ctx, d)}</div>
      ${recent(ctx, d)}
      ${nudge(ctx)}
    </div>
  </div>`;
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
  const bh = $("#blade-hours", root);
  if (bh) bh.innerHTML = timeNum(info.hours * 60).text;
  const allEl = $("#blade-all", root);
  if (allEl) allEl.innerHTML = durationMarkup(lifetimeSeconds(ctx.state)).text;
  set("#blade-limit", fmtNum(info.limit));
  set("#blade-left", info.left > 0 ? `${fmtMinutes(info.left * 60)} left` : `Over by ${fmtMinutes(-info.left * 60)}`);
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
  const hm = allHM(ctx.state);
  const allH = $("#h-all-h", root);
  if (allH && document.activeElement !== allH) allH.value = hm.h;
  const allM = $("#h-all-m", root);
  if (allM && document.activeElement !== allM) allM.value = hm.m;
}

/* The all-time total as big numbers with small units: 10 hrs 14 mins 13 secs. */
const durationMarkup = (sec) => html`${durationParts(sec).map((p, i) => html`${i ? " " : ""}<b class="num">${p.n}</b> <span class="dim">${p.unit}</span>`)}`;

/* The whole hours and minutes of the all-time total, for the two boxes in the editor. */
function allHM(state) {
  const t = lifetimeSeconds(state);
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60) };
}

/* Hours put in by hand on the blades also go into the all-time total (see setBladeHours). */
const setHours = (ctx, wanted) => setBladeHours(ctx.state, wanted);

export function homeActions(ctx) {
  return {
    "go-plan": () => ctx.go("plan"),
    "go-ice": () => ctx.go("ice"),
    "go-compete": () => ctx.go("compete"),
    "go-compete-event": (el) => {
      location.hash = `#/compete/e/${el.dataset.id}`;
    },
    "log-off": () => openOffIceSheet(ctx),
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
      await ctx.cheer({ scene: "blade", title: "Fresh edges!", line: "Blade life is back to full." });
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
    /* The all-time total, as hours and minutes, is kept as you type. Leaving a box shows what is actually kept (it is never less than the
       hours on the blades or the sessions saved). */
    "blade-all": (el, event) => {
      const hBox = $("#h-all-h");
      const mBox = $("#h-all-m");
      if (event.type === "change") {
        const hm = allHM(ctx.state);
        hBox.value = hm.h;
        mBox.value = hm.m;
        return;
      }
      const h = Number(hBox.value);
      const m = Number(mBox.value);
      if (hBox.value === "" && mBox.value === "") return;
      if (h >= 0 && h <= LIFETIME_MAX && m >= 0 && m < 60) {
        setLifetimeHours(ctx.state, h + m / 60);
        ctx.save();
        paintBlade(ctx);
      }
    },
  };
}

