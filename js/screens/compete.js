/* Competitions: plan the skate for an event. The hub lists the next competition and your programs; a program has a setup, a layout on
   the rink, and a timing against the music; an event has a day and a result. Every view has its own address (#/compete/...), so
   the back button works. */

import { html, fmtDate } from "../util.js";
import { icon } from "../ui/parts.js";
import { toast, confirmSheet, $ } from "../ui/dom.js";
import {
  competeHref, parseCompeteHash, seasonLabel, nextEvent, upcomingEvents, pastEvents, daysUntil, countdownText, programStatus, readiness,
  kindName, fmtMmSs, parseMmSs, placingText, roman, typeName, markName, KINDS, ELEMENT_TYPES, MARKS, LIMITS, sanitizeProgram, sanitizeResult,
  moveElement, shiftElement, removeElement, spreadEvenly, setLength, removeMoment, timelineBlocks, overlaps, programSpan, sortDay,
} from "../compete.js";
import { uid, todayISO } from "../util.js";
import { openEventSheet, openProgramSheet, openElementSheet, openMomentSheet, openRunThrough, openDayItemSheet, replaceProgram, clockText } from "../ui/competesheets.js";
import { rinkInner, mountRink, RINK } from "../ui/rink.js";
import { sharePoster } from "../ui/share.js";

/* What the screen remembers between redraws: the selected element, and the kind last added. */
const ui = { programId: null, sel: null, lastType: "move", editResult: false, draft: null, draftFor: null };

const go = (href) => {
  if (location.hash !== href) location.hash = href;
};

const dateline = (today) => html`<div class="cp-date"><span>${fmtDate(today, { weekday: "long", month: "long", day: "numeric" })}</span><span>Season ${seasonLabel(today)}</span></div>`;

/* What the next step of a program is, for the stamp on its card. */
function nextStep(st) {
  if (!st.steps.elements) return "Elements";
  if (!st.steps.layout) return "Layout";
  if (!st.steps.timing) return "Timing";
  return "";
}

function programCard(ctx, p, stats) {
  const st = programStatus(p);
  const ev = ctx.state.events.find((e) => e.id === p.eventId);
  const rd = readiness(p, stats);
  const step = nextStep(st);
  const meta = [kindName(p.kind), fmtMmSs(p.lengthSec), p.music.title].filter(Boolean).join(" · ");
  return html`<button class="cp-pcard cp-paper" type="button" data-action="open-program" data-id="${p.id}">
    ${step ? html`<span class="cp-stamp">${step}</span>` : ""}
    <h3>${p.name}</h3>
    <p>${meta}</p>
    <p>${ev ? html`For ${ev.name}, ${fmtDate(ev.date, { month: "short", day: "numeric" })}` : "Not for a competition yet"}</p>
    <div class="cp-steps"><span class="cp-step ${st.steps.elements ? "" : "is-no"}">${st.total} ${st.total === 1 ? "element" : "elements"}</span><span class="cp-step ${st.steps.layout ? "" : "is-no"}">Layout</span><span class="cp-step ${st.steps.timing ? "" : "is-no"}">Timing</span></div>
    ${rd.linked ? html`<p>${rd.confident} of ${rd.linked} skills in it ${rd.linked === 1 ? "is" : "are"} earned.</p>` : ""}
  </button>`;
}

function nextSign(ctx, today) {
  const ev = nextEvent(ctx.state.events, today);
  if (!ev) return "";
  const days = daysUntil(ev.date, today);
  return html`<button class="cp-sign cp-bulbs" type="button" data-action="open-event" data-id="${ev.id}">
    <small>Next up</small>
    <h2>${ev.name}</h2>
    <span class="cp-when">${fmtDate(ev.date, { weekday: "short", month: "short", day: "numeric" })}${ev.place ? " · " + ev.place : ""}</span>
    <span class="cp-cd">${days > 1 ? html`${days}<span>days to go</span>` : countdownText(days)}</span>
  </button>`;
}

function eventRow(ev, today) {
  const days = daysUntil(ev.date, today);
  return html`<button class="cp-row" type="button" data-action="open-event" data-id="${ev.id}"><span>${ev.name}<small>${fmtDate(ev.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}${ev.place ? " · " + ev.place : ""}</small></span><b>${ev.result && ev.result.placing ? placingText(ev.result) : days >= 0 ? countdownText(days) : "Add result"}</b></button>`;
}

function hubView(ctx, d) {
  const { events, programs } = ctx.state;
  const today = d.today;
  const next = nextEvent(events, today);
  const later = upcomingEvents(events, today).filter((e) => !next || e.id !== next.id);
  const past = pastEvents(events, today);
  const empty = !events.length && !programs.length;
  return html`<div class="cp">
    ${dateline(today)}
    <header><h1 class="cp-ttl">Competitions</h1><p class="cp-sub">Plan the skate. Then skate the plan.</p></header>
    ${nextSign(ctx, today)}
    ${empty
      ? html`<section class="cp-paper cp-empty"><h2>One night only</h2><p>Planning for a competition? Start with the program: choose your music and your elements, place them on the rink, and set them to the music. Add the competition whenever you know its day, and MySkate counts down.</p></section>`
      : ""}
    <section class="cp-section" aria-label="Your programs">
      <p class="cp-label">Your programs</p>
      ${programs.map((p) => programCard(ctx, p, d.stats))}
      <button class="cp-new" type="button" data-action="new-program">${icon("plus")}New program</button>
    </section>
    ${later.length ? html`<section class="cp-section" aria-label="More competitions"><p class="cp-label">Coming up</p><div>${later.map((e) => eventRow(e, today))}</div></section>` : ""}
    ${past.length ? html`<section class="cp-section" aria-label="Past competitions"><p class="cp-label">Past competitions</p><div>${past.map((e) => eventRow(e, today))}</div></section>` : ""}
    <div class="cp-actions"><button class="cp-obtn" type="button" data-action="new-event"><span>New competition</span>${icon("plus")}</button></div>
    <p class="note">MySkate keeps your plan, not an event's rules. Length, elements, and times are yours to enter, so check the rules and ask your coach.</p>
  </div>`;
}

const programOf = (ctx, id) => ctx.state.programs.find((p) => p.id === id) || null;

const TYPE_HINT = { jump: "jump", spin: "spin", steps: "steps", move: "move", pose: "pose" };

/* "you: 4 skates" for an element that is one of your skills. */
function ratingOf(e, stats) {
  const st = e.skillId && stats.get(e.skillId);
  return st ? st.latest : null;
}
const skatesText = (n) => `${n} ${n === 1 ? "skate" : "skates"}`;

function elementDetail(e, stats) {
  const r = ratingOf(e, stats);
  return [typeName(e.type), r !== null ? `you: ${skatesText(r)}` : "", e.at !== null ? `starts ${fmtMmSs(e.at)}` : "", e.x === null ? "not on the rink" : ""].filter(Boolean).join(" · ");
}

function programHeader(ctx, p) {
  const ev = ctx.state.events.find((e) => e.id === p.eventId);
  const meta = [kindName(p.kind), fmtMmSs(p.lengthSec), p.music.title && (p.music.artist ? `${p.music.title}, ${p.music.artist}` : p.music.title)].filter(Boolean).join(" · ");
  return html`<button class="cp-back" type="button" data-action="back-hub">‹ Competitions</button>
    <header>
      <h1 class="cp-ttl">${p.name}</h1>
      <p class="cp-sub">${meta}</p>
      ${ev ? html`<p class="cp-sub"><button class="cp-link" type="button" data-action="open-event" data-id="${ev.id}">For ${ev.name}, ${fmtDate(ev.date, { month: "short", day: "numeric" })} ›</button></p>` : ""}
    </header>`;
}

function tabs(route) {
  const t = (id, name) => html`<button type="button" data-action="tab" data-tab="${id}" aria-pressed="${route.tab === id}">${name}</button>`;
  return html`<div class="seg cp-seg" role="group" aria-label="Program steps">${t("setup", "Setup")}${t("layout", "Layout")}${t("timing", "Timing")}</div>`;
}

/* Setup: the name, the music, the length, the kind, and the competition. */
function setupTab(ctx, p) {
  const events = [...ctx.state.events].sort((a, b) => a.date.localeCompare(b.date));
  return html`<section class="cp-paper cp-form" aria-label="Program details">
      <label class="cp-f"><span>Name</span><input class="cp-in" data-input="pg-name" type="text" maxlength="${LIMITS.name}" value="${p.name}" autocomplete="off"></label>
      <label class="cp-f"><span>Music</span><input class="cp-in" data-input="pg-title" type="text" maxlength="${LIMITS.text}" value="${p.music.title}" placeholder="Title" autocomplete="off"></label>
      <label class="cp-f"><span>Composer or artist</span><input class="cp-in cp-in--small" data-input="pg-artist" type="text" maxlength="${LIMITS.text}" value="${p.music.artist}" autocomplete="off"></label>
      <div class="cp-f cp-f--row"><label><span>Length</span><input class="cp-in cp-in--time" data-input="pg-length" type="text" inputmode="numeric" value="${fmtMmSs(p.lengthSec)}" aria-label="Length, like 1:30" autocomplete="off"></label>
        <span class="cp-stepper"><button type="button" data-action="len" data-d="-5" aria-label="Five seconds shorter">−</button><button type="button" data-action="len" data-d="5" aria-label="Five seconds longer">+</button></span></div>
      <div class="cp-f"><span id="kind-l">Kind</span><div class="cp-kinds" role="group" aria-labelledby="kind-l">${KINDS.map((k) => html`<button type="button" data-action="set-kind" data-kind="${k.id}" aria-pressed="${p.kind === k.id}">${k.name}</button>`)}</div></div>
      <label class="cp-f"><span>Competition</span><select class="cp-in cp-in--small" data-input="pg-event"><option value="">Not yet</option>${events.map((e) => html`<option value="${e.id}" ${e.id === p.eventId ? "selected" : ""}>${e.name} · ${fmtDate(e.date, { month: "short", day: "numeric", year: "numeric" })}</option>`)}</select></label>
      <label class="cp-f"><span>Notes</span><textarea class="cp-in cp-in--small" data-input="pg-note" rows="2" maxlength="${LIMITS.note}" placeholder="What this program is about, or what your coach said">${p.note}</textarea></label>
      <p class="note">Your event decides the length and what is required. Check its rules and ask your coach.</p>
    </section>
    <div class="cp-actions"><button class="cp-ghost" type="button" data-action="share-poster" data-id="${p.id}">Share a poster</button><button class="cp-ghost cp-ghost--danger" type="button" data-action="delete-program">Delete this program</button></div>`;
}

/* Layout: the rink, the marks on it, and the running order. */
function layoutTab(ctx, p, d) {
  const st = programStatus(p);
  const sel = p.elements.find((e) => e.id === ui.sel) || null;
  const n = sel ? p.elements.indexOf(sel) + 1 : 0;
  return html`<section class="cp-bp" aria-label="The rink">
      <svg id="rink" class="cp-rink" viewBox="0 0 ${RINK.w} ${RINK.h}" role="group" aria-label="Rink diagram, ${st.placed} of ${st.total} elements placed">${rinkInner(p, ui.sel)}</svg>
      <p class="cp-hint">${p.elements.length ? "Tap a mark to select it and drag it to move it. Tap empty ice to add another." : "Tap the ice to place your first element."}</p>
      ${sel
        ? html`<div class="cp-sel"><div><b>${roman(n)}. ${sel.label}</b><span>${elementDetail(sel, d.stats)}</span></div>
            <div class="cp-nudge" role="group" aria-label="Nudge ${sel.label}"><button type="button" data-action="nudge" data-dx="-1" data-dy="0" aria-label="Move left">←</button><button type="button" data-action="nudge" data-dx="0" data-dy="-1" aria-label="Move up">↑</button><button type="button" data-action="nudge" data-dx="0" data-dy="1" aria-label="Move down">↓</button><button type="button" data-action="nudge" data-dx="1" data-dy="0" aria-label="Move right">→</button></div>
            <div class="cp-actions"><button class="cp-ghost" type="button" data-action="edit-el" data-id="${sel.id}">Edit</button><button class="cp-ghost cp-ghost--danger" type="button" data-action="remove-el" data-id="${sel.id}">Remove</button></div></div>`
        : ""}
    </section>
    <div class="cp-pal" role="group" aria-label="Add an element">${ELEMENT_TYPES.map((t) => html`<button class="cp-chip" type="button" data-action="add-el" data-type="${t.id}">+ ${t.name}</button>`)}</div>
    ${p.elements.length
      ? html`<ol class="cp-els" aria-label="Running order">${p.elements.map((e, i) => html`<li class="cp-el${e.id === ui.sel ? " is-sel" : ""}">
          <button class="cp-el__main" type="button" data-action="select-el" data-id="${e.id}" aria-pressed="${e.id === ui.sel}"><span class="cp-el__n">${roman(i + 1)}.</span><span class="cp-el__name">${e.label}<small>${elementDetail(e, d.stats)}</small></span></button>
          <span class="cp-el__tools"><button class="icon-btn icon-btn--sm" type="button" data-action="up-el" data-id="${e.id}" aria-label="Move ${e.label} earlier" ${i === 0 ? "disabled" : ""}>${icon("up")}</button><button class="icon-btn icon-btn--sm" type="button" data-action="down-el" data-id="${e.id}" aria-label="Move ${e.label} later" ${i === p.elements.length - 1 ? "disabled" : ""}>${icon("down")}</button><button class="icon-btn icon-btn--sm" type="button" data-action="edit-el" data-id="${e.id}" aria-label="Edit ${e.label}">${icon("edit")}</button></span></li>`)}</ol>`
      : ""}
    <div class="cp-actions"><button class="cp-obtn" type="button" data-action="tab" data-tab="timing"><span>On to timing</span>${icon("right")}</button></div>`;
}

/* Timing: the music as a track, each element as a block on it, and the start and length of each. */
function timingTab(ctx, p) {
  const blocks = timelineBlocks(p);
  const span = programSpan(p);
  const clash = overlaps(p);
  const st = programStatus(p);
  const step = p.lengthSec <= 60 ? 15 : 30;
  const marks = [];
  for (let t = 0; t < p.lengthSec; t += step) marks.push(t);
  marks.push(p.lengthSec);
  const num = (id) => roman(p.elements.findIndex((e) => e.id === id) + 1);
  const label = (id) => `${num(id)}. ${p.elements.find((e) => e.id === id).label}`;
  return html`<section class="cp-music" aria-label="The music, ${fmtMmSs(p.lengthSec)}">
      <div class="cp-track" role="group" aria-label="Elements on the music">
        ${p.moments.map((m) => html`<i class="cp-flag" style="left:${(m.at / p.lengthSec) * 100}%" title="${fmtMmSs(m.at)} ${m.text}"></i>`)}
        ${blocks.map((b) => html`<button class="cp-blk cp-t-${b.type}${b.id === ui.sel ? " is-sel" : ""}" type="button" style="left:${b.left}%;width:${b.width}%" data-action="select-el" data-id="${b.id}" aria-label="${label(b.id)}, starts ${fmtMmSs(b.at)}"><span>${num(b.id)}</span></button>`)}
      </div>
      <div class="cp-ruler" aria-hidden="true">${marks.map((t) => html`<span style="left:${(t / p.lengthSec) * 100}%">${fmtMmSs(t)}</span>`)}</div>
    </section>
    <div class="cp-moments"><p class="cp-label">Notes on the music</p><div class="cp-chips">${p.moments.map((m) => html`<button class="cp-chip cp-chip--gold" type="button" data-action="rm-moment" data-id="${m.id}" aria-label="Remove note: ${fmtMmSs(m.at)} ${m.text}">${fmtMmSs(m.at)} ${m.text} ×</button>`)}<button class="cp-chip" type="button" data-action="add-moment">+ Add a note</button></div></div>
    ${p.elements.length
      ? html`<div class="cp-times" role="group" aria-label="Start and length of each element">${p.elements.map((e, i) => html`<div class="cp-trow${e.id === ui.sel ? " is-sel" : ""}"><button class="cp-trow__name" type="button" data-action="select-el" data-id="${e.id}"><span>${roman(i + 1)}.</span> ${e.label}</button>
          <label class="cp-trow__f"><span>Start</span><input class="input input--num cp-time" data-input="el-at" data-id="${e.id}" type="text" inputmode="numeric" value="${e.at === null ? "" : fmtMmSs(e.at)}" placeholder="0:00" aria-label="Start of ${e.label}, like 0:44" autocomplete="off"></label>
          <label class="cp-trow__f"><span>Seconds</span><input class="input input--num cp-time" data-input="el-dur" data-id="${e.id}" type="text" inputmode="numeric" value="${e.dur || ""}" placeholder="0" aria-label="Length of ${e.label} in seconds" autocomplete="off"></label></div>`)}</div>
        <p class="note cp-sum">${st.timed} of ${st.total} timed${st.timed ? ` · the last one ends at ${fmtMmSs(span.lastEnd)} · ${fmtMmSs(span.room)} of music left` : ""}</p>
        ${clash.length ? html`<p class="cp-warn" role="status">These overlap: ${clash.map(([a, b]) => `${label(a)} and ${label(b)}`).join("; ")}.</p>` : ""}`
      : html`<p class="note">Add your elements on the Layout step first, then set them to the music here.</p>`}
    <div class="cp-actions"><button class="cp-obtn" type="button" data-action="run" ${p.elements.length ? "" : "disabled"}><span>Run it through</span>${icon("right")}</button>${p.elements.length ? html`<button class="cp-ghost" type="button" data-action="spread">Spread evenly</button>` : ""}</div>`;
}

function programView(ctx, route, d) {
  const p = programOf(ctx, route.id);
  if (!p) return hubView(ctx, d);
  if (ui.programId !== p.id) {
    ui.programId = p.id;
    ui.sel = null;
  }
  return html`<div class="cp">
    ${programHeader(ctx, p)}
    ${tabs(route)}
    ${route.tab === "setup" ? setupTab(ctx, p) : route.tab === "timing" ? timingTab(ctx, p) : layoutTab(ctx, p, d)}
  </div>`;
}

const eventOf = (ctx, id) => ctx.state.events.find((e) => e.id === id) || null;

/* The day, in time order, with your skate stood out and the Zamboni in its stripes. */
function dayList(ev) {
  const items = sortDay(ev.day);
  if (!items.length) return html`<p class="note">Nothing yet. Add check-in, warm-up, and your skate, with the times your event posts.</p>`;
  return html`<ol class="cp-dayl">${items.map((i) => html`<li class="cp-di${i.mine ? " is-mine" : ""}${/zamboni|resurfac/i.test(i.label) ? " is-zam" : ""}"><span class="cp-di__t">${clockText(i.time)}</span><button class="cp-di__b" type="button" data-action="edit-day" data-id="${i.id}" aria-label="Edit: ${i.label}, ${clockText(i.time)}"><b>${i.label}</b>${i.mins ? html`<small>${i.mins} min</small>` : ""}</button></li>`)}</ol>`;
}

function resultCard(ctx, ev, program) {
  const r = ev.result;
  if (!r) return "";
  return html`<section class="cp-score" aria-label="Result">${scoreboard(ctx, ev, program)}</section>`;
}

/* The kiss and cry: how it went, as a scoreboard. */
function scoreboard(ctx, ev, program) {
  const r = ev.result;
  const marks = program ? program.elements.filter((e) => r.marks[e.id]) : [];
  const nxt = nextEvent(ctx.state.events.filter((e) => e.id !== ev.id), todayISO());
  return html`<div class="cp-tv">
      <div class="cp-tv__bar"><b>Kiss &amp; cry</b><span>${ev.name} · ${fmtDate(ev.date, { month: "short", day: "numeric", year: "numeric" })}</span></div>
      <div class="cp-tv__lower"><i></i><div><small>${ctx.state.profile.name || "Skater"}${program ? " · " + kindName(program.kind) : ""}</small><b>${program ? program.name : ev.name}</b></div></div>
      ${r.placing ? html`<div class="cp-tv__score"><small>Placing</small><span class="num">${placingText(r)}</span></div>` : ""}
      ${marks.length ? html`<ol class="cp-tv__els">${marks.map((e) => html`<li><span>${roman(program.elements.indexOf(e) + 1)}</span>${e.label}<em class="is-${r.marks[e.id]}">${markName(r.marks[e.id]).toLowerCase()}</em></li>`)}</ol>` : ""}
      ${r.coach ? html`<p class="cp-tv__q"><b>Coach:</b> ${r.coach}</p>` : ""}
      ${r.note ? html`<p class="cp-tv__q"><b>You:</b> ${r.note}</p>` : ""}
      ${nxt ? html`<p class="cp-tv__next">Next skater: <b>you</b> · ${nxt.name} · ${fmtDate(nxt.date, { month: "short", day: "numeric" })}</p>` : ""}
    </div>`;
}

function eventView(ctx, route, d) {
  const ev = eventOf(ctx, route.id);
  if (!ev) return hubView(ctx, d);
  if (route.results) return resultsView(ctx, ev, d);
  const days = daysUntil(ev.date, d.today);
  const here = ctx.state.programs.filter((p) => p.eventId === ev.id);
  const free = ctx.state.programs.filter((p) => !p.eventId);
  const program = ev.result && ev.result.programId ? ctx.state.programs.find((p) => p.id === ev.result.programId) : here[0] || null;
  return html`<div class="cp">
    <button class="cp-back" type="button" data-action="back-hub">‹ Competitions</button>
    <header>
      <h1 class="cp-ttl">${ev.name}</h1>
      <p class="cp-sub">${fmtDate(ev.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${ev.place ? " · " + ev.place : ""}</p>
      <p class="cp-sub"><span class="cp-when-chip ${days < 0 ? "is-past" : ""}">${days >= 0 ? (days > 1 ? `${days} days to go` : countdownText(days)) : countdownText(days)}</span> <button class="cp-link" type="button" data-action="edit-event">Edit</button></p>
    </header>
    ${resultCard(ctx, ev, program)}
    <section class="cp-section" aria-label="Programs for this competition">
      <p class="cp-label">Programs</p>
      ${here.length
        ? html`<div>${here.map((p) => html`<button class="cp-row" type="button" data-action="open-program" data-id="${p.id}"><span>${p.name}<small>${kindName(p.kind)} · ${fmtMmSs(p.lengthSec)} · ${p.elements.length} ${p.elements.length === 1 ? "element" : "elements"}${programStatus(p).done ? " · planned" : ""}</small></span><b>Open</b></button>`)}</div><div class="cp-chips">${here.map((p) => html`<button class="cp-chip" type="button" data-action="share-poster" data-id="${p.id}">Share a poster: ${p.name}</button>`)}</div>`
        : html`<p class="note">No program yet. Attach one you have started, or begin a new one for this competition.</p>`}
      <div class="cp-chips">${free.map((p) => html`<button class="cp-chip" type="button" data-action="attach" data-id="${p.id}">Attach ${p.name}</button>`)}<button class="cp-chip" type="button" data-action="new-program-here">+ New program</button></div>
    </section>
    <section class="cp-section" aria-label="The day">
      <p class="cp-label">The day</p>
      <div class="cp-paper cp-day">${dayList(ev)}<div class="cp-actions"><button class="cp-ghost cp-ghost--ink" type="button" data-action="add-day">Add to the day</button></div></div>
    </section>
    <section class="cp-section" aria-label="What to bring">
      <p class="cp-label">What to bring</p>
      <ul class="cp-bring">${ev.bring.map((b) => html`<li><button class="cp-chk" type="button" role="checkbox" aria-checked="${b.done}" data-action="bring-toggle" data-id="${b.id}"><i>${icon("check")}</i><span>${b.text}</span></button><button class="icon-btn icon-btn--sm" type="button" data-action="bring-remove" data-id="${b.id}" aria-label="Remove: ${b.text}">${icon("x")}</button></li>`)}</ul>
      <div class="cp-addrow"><input class="input" data-input="bring-new" type="text" maxlength="${LIMITS.text}" placeholder="Add something to bring" aria-label="Something to bring" autocomplete="off"><button class="cp-ghost" type="button" data-action="bring-add">Add</button></div>
    </section>
    <div class="cp-actions"><button class="cp-obtn" type="button" data-action="open-results"><span>${ev.result ? "See the result" : days <= 0 ? "Record the result" : "Result, afterwards"}</span>${icon("right")}</button></div>
    <div class="cp-actions"><button class="cp-ghost cp-ghost--danger" type="button" data-action="delete-event">Delete this competition</button></div>
  </div>`;
}

/* The result form: placing, how each element went, and what was said. Held as a draft until saved. */
function resultsView(ctx, ev, d) {
  const here = ctx.state.programs.filter((p) => p.eventId === ev.id);
  if (!ui.draft || ui.draftFor !== ev.id) {
    const r = ev.result;
    ui.draftFor = ev.id;
    ui.draft = { programId: (r && r.programId) || (here[0] && here[0].id) || "", placing: r && r.placing ? String(r.placing) : "", of: r && r.of ? String(r.of) : "", marks: { ...(r ? r.marks : {}) }, coach: r ? r.coach : "", note: r ? r.note : "" };
    ui.editResult = !r;
  }
  const dr = ui.draft;
  const program = ctx.state.programs.find((p) => p.id === dr.programId) || null;
  const back = html`<button class="cp-back" type="button" data-action="back-event" data-id="${ev.id}">‹ ${ev.name}</button>`;
  if (ev.result && !ui.editResult) {
    return html`<div class="cp">${back}<header><h1 class="cp-ttl">How it went</h1></header><section class="cp-score">${scoreboard(ctx, ev, program)}</section>
      <div class="cp-actions"><button class="cp-obtn" type="button" data-action="back-hub"><span>Plan the next one</span>${icon("right")}</button><button class="cp-ghost" type="button" data-action="edit-result">Edit the result</button></div></div>`;
  }
  return html`<div class="cp">${back}
    <header><h1 class="cp-ttl">How did it go?</h1><p class="cp-sub">${ev.name}, ${fmtDate(ev.date, { month: "long", day: "numeric", year: "numeric" })}. Only what you want to remember.</p></header>
    <section class="cp-paper cp-form">
      <div class="cp-f cp-f--row"><label><span>Placing</span><input class="cp-in cp-in--time" data-input="rs-placing" type="text" inputmode="numeric" value="${dr.placing}" placeholder="2" aria-label="Your placing, like 2" autocomplete="off"></label><label><span>Out of</span><input class="cp-in cp-in--time" data-input="rs-of" type="text" inputmode="numeric" value="${dr.of}" placeholder="9" aria-label="How many skaters" autocomplete="off"></label></div>
      ${here.length > 1 ? html`<label class="cp-f"><span>Program</span><select class="cp-in cp-in--small" data-input="rs-program">${here.map((p) => html`<option value="${p.id}" ${p.id === dr.programId ? "selected" : ""}>${p.name}</option>`)}</select></label>` : ""}
      ${program && program.elements.length
        ? html`<div class="cp-f"><span>How each element went</span><div class="cp-marks">${program.elements.map((e, i) => html`<div class="cp-mk"><b>${roman(i + 1)}. ${e.label}</b><div class="cp-kinds" role="group" aria-label="${e.label}">${MARKS.map((m) => html`<button type="button" data-action="set-mark" data-id="${e.id}" data-mark="${m.id}" aria-pressed="${dr.marks[e.id] === m.id}">${m.name}</button>`)}</div></div>`)}</div></div>`
        : html`<p class="note">Attach a program to this competition to mark how each element went.</p>`}
      <label class="cp-f"><span>What your coach said</span><textarea class="cp-in cp-in--small" data-input="rs-coach" rows="2" maxlength="${LIMITS.note}" placeholder="Keep the free leg quiet in the spin">${dr.coach}</textarea></label>
      <label class="cp-f"><span>Your own note</span><textarea class="cp-in cp-in--small" data-input="rs-note" rows="2" maxlength="${LIMITS.note}" placeholder="How it felt">${dr.note}</textarea></label>
    </section>
    <div class="cp-actions"><button class="cp-obtn" type="button" data-action="save-result"><span>Save the result</span>${icon("right")}</button>${ev.result ? html`<button class="cp-ghost cp-ghost--danger" type="button" data-action="clear-result">Remove the result</button>` : ""}</div>
  </div>`;
}

export function renderCompete(ctx) {
  const route = parseCompeteHash(location.hash);
  const d = ctx.derive();
  if (route.view === "program") return programView(ctx, route, d);
  if (route.view === "event") return eventView(ctx, route, d);
  return hubView(ctx, d);
}

/* On the Layout step, the rink listens for taps and drags. */
export function mountCompete(ctx) {
  const route = parseCompeteHash(location.hash);
  const svg = document.querySelector("#rink");
  if (route.view !== "program" || !svg) return () => {};
  const current = () => programOf(ctx, route.id);
  return mountRink(svg, {
    getProgram: current,
    selected: () => ui.sel,
    onSelect: (id) => {
      ui.sel = ui.sel === id ? null : id;
      ctx.update();
    },
    onMove: (id, x, y, opts = {}) => {
      replaceProgram(ctx, moveElement(current(), id, x, y));
      ui.sel = id;
      ctx.update();
      if (opts.keep) document.querySelector(`.cp-mark[data-el="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
    },
    onPlace: async (x, y) => {
      const id = await openElementSheet(ctx, { programId: route.id, x, y, type: ui.lastType });
      if (id && id !== "removed") ui.sel = id;
      ctx.update();
    },
  });
}

const routeNow = () => parseCompeteHash(location.hash);

/* "2" as 2, and anything that is not a plain whole number (up to three digits) as nothing. */
const wholeNumber = (v) => (/^\d{1,3}$/.test(String(v).trim()) ? Number(String(v).trim()) : null);

export function competeActions(ctx) {
  const prog = () => programOf(ctx, routeNow().id);
  const patch = (fields) => {
    const p = prog();
    if (!p) return;
    replaceProgram(ctx, sanitizeProgram({ ...p, ...fields }));
  };
  return {
    "back-hub": () => go(competeHref()),
    "open-program": (el) => go(competeHref({ view: "program", id: el.dataset.id })),
    "open-event": (el) => go(competeHref({ view: "event", id: el.dataset.id })),
    "new-event": async () => {
      const id = await openEventSheet(ctx);
      if (id) {
        toast("Competition added.");
        go(competeHref({ view: "event", id }));
      }
    },
    "new-program": async () => {
      const id = await openProgramSheet(ctx);
      if (id) go(competeHref({ view: "program", id, tab: "layout" }));
    },
    tab: (el) => go(competeHref({ view: "program", id: routeNow().id, tab: el.dataset.tab })),
    "select-el": (el) => {
      ui.sel = ui.sel === el.dataset.id ? null : el.dataset.id;
      ctx.update();
    },
    "add-el": async (el) => {
      ui.lastType = el.dataset.type;
      const id = await openElementSheet(ctx, { programId: routeNow().id, type: el.dataset.type });
      if (id && id !== "removed") ui.sel = id;
      ctx.update();
    },
    "edit-el": async (el) => {
      await openElementSheet(ctx, { programId: routeNow().id, elementId: el.dataset.id });
      ctx.update();
    },
    "remove-el": async (el) => {
      const p = prog();
      const e = p.elements.find((x) => x.id === el.dataset.id);
      if (!(await confirmSheet({ title: "Remove this element?", message: `${e.label} comes out of the program, with its place on the rink and its time in the music.`, confirmLabel: "Remove" }))) return;
      replaceProgram(ctx, removeElement(p, e.id));
      ui.sel = null;
      ctx.update();
    },
    "up-el": (el) => {
      replaceProgram(ctx, shiftElement(prog(), el.dataset.id, -1));
      ctx.update();
    },
    "down-el": (el) => {
      replaceProgram(ctx, shiftElement(prog(), el.dataset.id, 1));
      ctx.update();
    },
    nudge: (el) => {
      const p = prog();
      const e = p.elements.find((x) => x.id === ui.sel);
      if (!e) return;
      const x = Math.min(0.94, Math.max(0.06, e.x + Number(el.dataset.dx) * 0.03));
      const y = Math.min(0.9, Math.max(0.1, e.y + Number(el.dataset.dy) * 0.04));
      replaceProgram(ctx, moveElement(p, e.id, x, y));
      ctx.update();
    },
    len: (el) => {
      const p = prog();
      replaceProgram(ctx, setLength(p, p.lengthSec + Number(el.dataset.d)));
      ctx.update();
    },
    "set-kind": (el) => {
      patch({ kind: el.dataset.kind });
      ctx.update();
    },
    "delete-program": async () => {
      const p = prog();
      if (!(await confirmSheet({ title: "Delete this program?", message: `${p.name} and its layout and timing are removed. This cannot be undone, so save a backup first if you are unsure.`, confirmLabel: "Delete" }))) return;
      ctx.state.programs = ctx.state.programs.filter((x) => x.id !== p.id);
      ctx.save();
      toast("Program deleted.");
      go(competeHref());
    },
    spread: async () => {
      const p = prog();
      if (p.elements.some((e) => e.at !== null) && !(await confirmSheet({ title: "Spread them evenly?", message: "Every element gets a new start and length, evenly through the music. Times you set yourself are replaced.", confirmLabel: "Spread evenly", tone: "gold" }))) return;
      replaceProgram(ctx, spreadEvenly(p));
      ctx.update();
    },
    run: () => openRunThrough(ctx, routeNow().id),
    "edit-event": async () => {
      await openEventSheet(ctx, eventOf(ctx, routeNow().id));
      ctx.update();
    },
    "share-poster": async (el) => {
      const p = programOf(ctx, el.dataset.id);
      if (p) await sharePoster(p, eventOf(ctx, p.eventId), ctx.state.profile.name);
    },
    "back-event": (el) => go(competeHref({ view: "event", id: el.dataset.id })),
    "open-results": () => go(competeHref({ view: "event", id: routeNow().id, results: true })),
    attach: (el) => {
      const ev = routeNow().id;
      replaceProgram(ctx, { ...programOf(ctx, el.dataset.id), eventId: ev });
      ctx.update();
    },
    "new-program-here": async () => {
      const id = await openProgramSheet(ctx, { eventId: routeNow().id });
      if (id) go(competeHref({ view: "program", id, tab: "layout" }));
    },
    "add-day": async () => {
      if (await openDayItemSheet(ctx, routeNow().id)) ctx.update();
    },
    "edit-day": async (el) => {
      if (await openDayItemSheet(ctx, routeNow().id, el.dataset.id)) ctx.update();
    },
    "bring-toggle": (el) => {
      const ev = eventOf(ctx, routeNow().id);
      ctx.state.events = ctx.state.events.map((e) => (e.id === ev.id ? { ...e, bring: e.bring.map((b) => (b.id === el.dataset.id ? { ...b, done: !b.done } : b)) } : e));
      ctx.save();
      ctx.update();
    },
    "bring-remove": (el) => {
      const ev = eventOf(ctx, routeNow().id);
      ctx.state.events = ctx.state.events.map((e) => (e.id === ev.id ? { ...e, bring: e.bring.filter((b) => b.id !== el.dataset.id) } : e));
      ctx.save();
      ctx.update();
    },
    "bring-add": () => {
      const input = $('[data-input="bring-new"]');
      const text = input.value.trim();
      const ev = eventOf(ctx, routeNow().id);
      if (!text) return input.focus();
      if (ev.bring.length >= LIMITS.bring) return toast(`A list holds up to ${LIMITS.bring} things.`);
      ctx.state.events = ctx.state.events.map((e) => (e.id === ev.id ? { ...e, bring: [...e.bring, { id: uid(), text: text.slice(0, LIMITS.text), done: false }] } : e));
      ctx.save();
      ctx.update();
    },
    "delete-event": async () => {
      const ev = eventOf(ctx, routeNow().id);
      if (!(await confirmSheet({ title: "Delete this competition?", message: `${ev.name}, its day, its list, and its result are removed. Your programs stay, and are no longer attached to it. This cannot be undone, so save a backup first if you are unsure.`, confirmLabel: "Delete" }))) return;
      ctx.state.events = ctx.state.events.filter((e) => e.id !== ev.id);
      ctx.state.programs = ctx.state.programs.map((p) => (p.eventId === ev.id ? { ...p, eventId: "" } : p));
      ctx.save();
      toast("Competition deleted.");
      go(competeHref());
    },
    "set-mark": (el) => {
      const dr = ui.draft;
      dr.marks[el.dataset.id] = dr.marks[el.dataset.id] === el.dataset.mark ? undefined : el.dataset.mark;
      if (dr.marks[el.dataset.id] === undefined) delete dr.marks[el.dataset.id];
      ctx.update();
    },
    "edit-result": () => {
      ui.editResult = true;
      ctx.update();
    },
    "save-result": () => {
      const ev = eventOf(ctx, routeNow().id);
      const dr = ui.draft;
      const result = sanitizeResult({ programId: dr.programId, placing: wholeNumber(dr.placing), of: wholeNumber(dr.of), marks: dr.marks, coach: dr.coach, note: dr.note, recordedOn: todayISO() });
      ctx.state.events = ctx.state.events.map((e) => (e.id === ev.id ? { ...e, result } : e));
      ctx.save();
      ui.editResult = false;
      toast("Result saved.");
      go(competeHref({ view: "event", id: ev.id }));
    },
    "clear-result": async () => {
      const ev = eventOf(ctx, routeNow().id);
      if (!(await confirmSheet({ title: "Remove the result?", message: "The placing, the marks, and the notes for this competition are removed.", confirmLabel: "Remove" }))) return;
      ctx.state.events = ctx.state.events.map((e) => (e.id === ev.id ? { ...e, result: null } : e));
      ctx.save();
      ui.draft = null;
      go(competeHref({ view: "event", id: ev.id }));
    },
    "add-moment": async () => {
      if (await openMomentSheet(ctx, routeNow().id)) ctx.update();
    },
    "rm-moment": (el) => {
      replaceProgram(ctx, removeMoment(prog(), el.dataset.id));
      ctx.update();
    },
  };
}

export function competeInputs(ctx) {
  const prog = () => programOf(ctx, routeNow().id);
  const patch = (fields) => {
    const p = prog();
    if (p) replaceProgram(ctx, sanitizeProgram({ ...p, ...fields }));
  };
  const editElement = (el, fields) => {
    const p = prog();
    if (!p) return;
    replaceProgram(ctx, sanitizeProgram({ ...p, elements: p.elements.map((e) => (e.id === el.dataset.id ? { ...e, ...fields } : e)) }));
  };
  return {
    "pg-name": (el) => patch({ name: el.value }),
    "pg-title": (el) => patch({ music: { ...prog().music, title: el.value } }),
    "pg-artist": (el) => patch({ music: { ...prog().music, artist: el.value } }),
    "pg-note": (el) => patch({ note: el.value }),
    "pg-event": (el, event) => {
      if (event.type !== "change") return;
      patch({ eventId: el.value });
      ctx.update();
    },
    "pg-length": (el, event) => {
      if (event.type !== "change") return;
      const sec = parseMmSs(el.value);
      if (sec === null || sec < LIMITS.lengthMin || sec > LIMITS.lengthMax) toast(`Enter a length like 1:30, between ${fmtMmSs(LIMITS.lengthMin)} and ${fmtMmSs(LIMITS.lengthMax)}.`, 4000);
      else replaceProgram(ctx, setLength(prog(), sec));
      ctx.update();
    },
    "el-at": (el, event) => {
      if (event.type !== "change") return;
      if (el.value.trim() === "") editElement(el, { at: null });
      else {
        const sec = parseMmSs(el.value);
        if (sec === null || sec > prog().lengthSec) toast(`Enter a time like 0:44, inside the music (up to ${fmtMmSs(prog().lengthSec)}).`, 4000);
        else editElement(el, { at: sec });
      }
      ctx.update();
    },
    "rs-placing": (el) => (ui.draft.placing = el.value),
    "rs-of": (el) => (ui.draft.of = el.value),
    "rs-program": (el, event) => {
      ui.draft.programId = el.value;
      ui.draft.marks = {};
      if (event.type === "change") ctx.update();
    },
    "rs-coach": (el) => (ui.draft.coach = el.value),
    "rs-note": (el) => (ui.draft.note = el.value),
    "bring-new": (el, event) => {
      if (event.type === "change" && el.value.trim()) el.closest(".cp-addrow").querySelector('[data-action="bring-add"]').focus();
    },
    "el-dur": (el, event) => {
      if (event.type !== "change") return;
      const sec = el.value.trim() === "" ? 0 : parseMmSs(el.value);
      if (sec === null) toast("Enter the length in seconds, like 14.", 4000);
      else editElement(el, { dur: sec });
      ctx.update();
    },
  };
}
