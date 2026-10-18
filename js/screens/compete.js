/* Competitions: plan the skate for an event. The hub lists the next competition and your programs; a program has a setup, a layout on
   the rink, and a timing against the music; an event has a day and a result. Every view has its own address (#/compete/...), so
   the back button works. */

import { html, fmtDate } from "../util.js";
import { icon } from "../ui/parts.js";
import { toast, confirmSheet, $ } from "../ui/dom.js";
import {
  competeHref, parseCompeteHash, seasonLabel, nextEvent, upcomingEvents, pastEvents, daysUntil, countdownText, programStatus, readiness,
  kindName, fmtMmSs, parseMmSs, placingText, roman, typeName, KINDS, ELEMENT_TYPES, LIMITS, sanitizeProgram, moveElement, shiftElement,
  removeElement, spreadEvenly, setLength, removeMoment, timelineBlocks, overlaps, programSpan,
} from "../compete.js";
import { openEventSheet, openProgramSheet, openElementSheet, openMomentSheet, openRunThrough, replaceProgram } from "../ui/competesheets.js";
import { rinkInner, mountRink, RINK } from "../ui/rink.js";

/* What the screen remembers between redraws: the selected element, and the kind last added. */
const ui = { programId: null, sel: null, lastType: "move" };

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
    <div class="cp-actions"><button class="cp-ghost cp-ghost--danger" type="button" data-action="delete-program">Delete this program</button></div>`;
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

function eventView(ctx, route, d) {
  const e = ctx.state.events.find((x) => x.id === route.id);
  if (!e) return hubView(ctx, d);
  return html`<div class="cp"><button class="cp-back" type="button" data-action="back-hub">‹ Competitions</button><h1 class="cp-ttl">${e.name}</h1></div>`;
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
    "el-dur": (el, event) => {
      if (event.type !== "change") return;
      const sec = el.value.trim() === "" ? 0 : parseMmSs(el.value);
      if (sec === null) toast("Enter the length in seconds, like 14.", 4000);
      else editElement(el, { dur: sec });
      ctx.update();
    },
  };
}
