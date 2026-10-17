/* Ice times: your rinks' weekly sessions on one page. Add rinks and sessions once (or import a calendar file), star the
   sessions you want, and see them together for the week. The logic is in js/ice.js. */

import { html, uid, todayISO, addDays, weekKey, fmtDate, daysBetween } from "../util.js";
import { $, $$, openSheet, confirmSheet, toast, download } from "../ui/dom.js";
import { icon } from "../ui/parts.js";
import {
  KINDS,
  kindName,
  DAY_NAMES,
  DAY_SHORT,
  LIMITS,
  fmtRange,
  isTime,
  isDay,
  toMin,
  sanitizeRink,
  sanitizeIceSession,
  nextRinkColor,
  weekDates,
  occurrencesInWeek,
  filterOccurrences,
  pickClashes,
  parseIcs,
  buildIcs,
  slotFor,
} from "../ice.js";

const ui = { week: null, filtersOpen: false };
const currentWeek = () => ui.week || weekKey(todayISO());
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const rinkOf = (ctx, id) => ctx.state.rinks.find((r) => r.id === id);
const dayList = (days) => days.map((d) => DAY_SHORT[d - 1]).join(", ");
const rangeOf = (s) => fmtRange(s.start, s.end);

/* ---------- The page ---------- */

function emptyCard() {
  return html`<section class="card card--ice stack">
    <h2>Every rink's ice, in one week</h2>
    <p class="dim">Add the rinks you skate at, copy their weekly sessions in once (or import a calendar file), then star the sessions you want. MySkate shows them together, so you do not have to hop between rink websites.</p>
    <div class="cluster"><button class="btn" type="button" data-action="add-rink">Add a rink</button></div>
    <p class="note">Rinks change their schedules, so check the rink's own page before you go. MySkate only knows what you put in.</p>
  </section>`;
}

function controls(ctx) {
  const { state } = ctx;
  const v = state.iceView;
  const picks = state.iceSessions.filter((s) => s.pick).length;
  const kinds = KINDS.filter((k) => state.iceSessions.some((s) => s.kind === k.id) || v.kinds.includes(k.id));
  const canFilter = kinds.length > 1 || state.rinks.length > 1;
  const active = v.kinds.length + v.rinkIds.length;
  return html`<section class="card ice-filters" aria-label="Show and filter">
    <div class="cluster">
      <div class="seg" role="group" aria-label="Show">
        <button type="button" data-action="picks-off" aria-pressed="${!v.picksOnly}">All sessions</button>
        <button type="button" data-action="picks-on" aria-pressed="${v.picksOnly}">My picks · ${picks}</button>
      </div>
      ${canFilter ? html`<button class="chip" type="button" data-action="filters-toggle" aria-expanded="${ui.filtersOpen}" aria-controls="ice-filter-panel">Filter${active ? ` · ${active}` : ""}</button>` : ""}
      ${active ? html`<button class="chip" type="button" data-action="filters-clear">Clear</button>` : ""}
    </div>
    ${canFilter && ui.filtersOpen
      ? html`<div class="stack" id="ice-filter-panel">
          ${kinds.length > 1 ? html`<div class="field"><span id="f-kind">Type</span><div class="limit-row" role="group" aria-labelledby="f-kind">${kinds.map((k) => html`<button class="chip" type="button" data-action="kind" data-kind="${k.id}" aria-pressed="${v.kinds.includes(k.id)}">${k.name}</button>`)}</div></div>` : ""}
          ${state.rinks.length > 1 ? html`<div class="field"><span id="f-rink">Rink</span><div class="limit-row" role="group" aria-labelledby="f-rink">${state.rinks.map((r) => html`<button class="chip" type="button" data-action="rink-filter" data-id="${r.id}" aria-pressed="${v.rinkIds.includes(r.id)}"><i class="dot" style="--rk:${r.color}"></i>${r.name}</button>`)}</div></div>` : ""}
          <p class="note">Nothing selected means all of them.</p>
        </div>`
      : ""}
  </section>`;
}

function sessionCard(ctx, o, clashes) {
  const rink = rinkOf(ctx, o.rinkId);
  const clash = clashes.get(o.key);
  const what = `${kindName(o.kind)} at ${rink.name}, ${fmtDate(o.date, { weekday: "long" })} ${rangeOf(o)}`;
  return html`<article class="ice-card ${o.pick ? "is-pick" : ""}" style="--rk:${rink.color}">
    <button class="ice-card__main" type="button" data-action="edit-session" data-id="${o.sessionId}" aria-label="Edit: ${what}">
      <span class="ice-time">${rangeOf(o)}</span>
      <span class="ice-kind">${kindName(o.kind)}</span>
      <span class="ice-rink"><i class="dot"></i>${rink.name}</span>
      ${o.note ? html`<span class="dim ice-note">${o.note}</span>` : ""}
      ${o.price !== null ? html`<span class="chip chip--tag">$${o.price}</span>` : ""}
    </button>
    <button class="ice-star" type="button" data-action="pick" data-id="${o.sessionId}" aria-pressed="${o.pick}" aria-label="${o.pick ? "Remove from My picks" : "Add to My picks"}: ${what}">${icon("star", o.pick ? "ic--fill" : "")}</button>
    ${clash ? html`<p class="ice-clash">Overlaps with ${kindName(clash[0].kind)} at ${(rinkOf(ctx, clash[0].rinkId) || { name: "another rink" }).name}, ${rangeOf(clash[0])}</p>` : ""}
  </article>`;
}

function weekParts(ctx) {
  const { state } = ctx;
  const today = todayISO();
  const start = currentWeek();
  const all = occurrencesInWeek(state.iceSessions, start);
  const clashes = pickClashes(all);
  const shown = filterOccurrences(all, state.iceView);
  const byDay = new Map(weekDates(start).map((d) => [d, []]));
  shown.forEach((o) => byDay.get(o.date).push(o));
  const away = daysBetween(weekKey(today), start) / 7;
  const when = away === 0 ? "This week" : away === 1 ? "Next week" : away === -1 ? "Last week" : away > 0 ? `${away} weeks ahead` : `${-away} weeks ago`;
  const md = { month: "short", day: "numeric" };

  let message = "";
  if (!state.iceSessions.length) message = html`<section class="card stack"><p class="dim">No sessions yet. Add the ones you care about, or import a calendar file from a rink.</p><div class="cluster"><button class="btn" type="button" data-action="add-session">Add a session</button><button class="btn btn--glass" type="button" data-action="import">Import a calendar file</button></div></section>`;
  else if (!shown.length) message = html`<section class="card"><p class="dim">${state.iceView.picksOnly && !state.iceSessions.some((s) => s.pick) ? "You have not picked any sessions yet. Choose All sessions and tap the star on the ones you want." : "No sessions match these filters this week."}</p></section>`;

  const bar = html`<div class="weekbar">
      <button class="icon-btn" type="button" data-action="week-prev" aria-label="Previous week">${icon("left")}</button>
      <div class="weekbar__label"><strong>${fmtDate(start, md)} – ${fmtDate(addDays(start, 6), md)}</strong><span class="dim">${when} · ${plural(shown.length, "session")}</span></div>
      <button class="icon-btn" type="button" data-action="week-next" aria-label="Next week">${icon("right")}</button>
      ${away !== 0 ? html`<button class="chip" type="button" data-action="week-today">This week</button>` : ""}
    </div>`;
  const body = html`${message}
    ${shown.length || !message
      ? html`<div class="ice-week">${[...byDay].map(([date, list]) => html`<section class="ice-day ${date === today ? "is-today" : ""} ${list.length ? "" : "is-empty"}" aria-labelledby="d-${date}">
          <h2 class="ice-day__head" id="d-${date}"><span>${fmtDate(date, { weekday: "short" })}</span><span class="num">${Number(date.slice(8))}</span>${date === today ? html`<span class="chip chip--on">Today</span>` : ""}</h2>
          ${list.length ? list.map((o) => sessionCard(ctx, o, clashes)) : html`<p class="dim ice-none">Nothing</p>`}
        </section>`)}</div>`
      : ""}`;
  return { bar, body };
}

function manage(ctx) {
  const { state } = ctx;
  return html`<section class="card stack" aria-labelledby="rinks-title">
    <h2 id="rinks-title">My rinks</h2>
    <div>${state.rinks.map((r) => {
      const n = state.iceSessions.filter((s) => s.rinkId === r.id).length;
      return html`<div class="row"><i class="dot" style="--rk:${r.color}"></i><span class="grow">${r.name}<br><span class="dim">${r.city ? r.city + " · " : ""}${plural(n, "session")}</span></span>${r.url ? html`<a class="chip" href="${r.url}" target="_blank" rel="noopener">Schedule page</a>` : ""}<button class="chip" type="button" data-action="edit-rink" data-id="${r.id}">Edit</button></div>`;
    })}</div>
    <div class="cluster">
      <button class="btn btn--glass btn--small" type="button" data-action="add-rink">Add a rink</button>
      <button class="btn btn--glass btn--small" type="button" data-action="import">Import a calendar file</button>
      <button class="btn btn--glass btn--small" type="button" data-action="export-picks">Add my picks to my calendar</button>
    </div>
    <p class="note">Rinks change their schedules, especially around holidays. Check the rink's own page before you go. MySkate only knows what you put in.</p>
  </section>`;
}

export function renderIce(ctx) {
  const { state } = ctx;
  const head = html`<header class="screen-head"><div><p class="eyebrow">Your week of ice</p><h1>Ice times</h1></div>${state.rinks.length ? html`<button class="btn btn--small" type="button" data-action="add-session">Add a session</button>` : ""}</header>`;
  if (!state.rinks.length) return html`${head}${emptyCard()}`;
  const { bar, body } = weekParts(ctx);
  return html`${head}${bar}${controls(ctx)}${body}${manage(ctx)}`;
}

/* ---------- Actions on the page ---------- */

export function iceActions(ctx) {
  const redraw = () => {
    ctx.save();
    ctx.update();
  };
  const toggle = (list, value) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  return {
    "week-prev": () => {
      ui.week = addDays(currentWeek(), -7);
      ctx.update();
    },
    "week-next": () => {
      ui.week = addDays(currentWeek(), 7);
      ctx.update();
    },
    "week-today": () => {
      ui.week = null;
      ctx.update();
    },
    "filters-toggle": () => {
      ui.filtersOpen = !ui.filtersOpen;
      ctx.update();
    },
    "filters-clear": () => {
      ctx.state.iceView.kinds = [];
      ctx.state.iceView.rinkIds = [];
      redraw();
    },
    "picks-on": () => {
      ctx.state.iceView.picksOnly = true;
      redraw();
    },
    "picks-off": () => {
      ctx.state.iceView.picksOnly = false;
      redraw();
    },
    kind: (el) => {
      ctx.state.iceView.kinds = toggle(ctx.state.iceView.kinds, el.dataset.kind);
      redraw();
    },
    "rink-filter": (el) => {
      ctx.state.iceView.rinkIds = toggle(ctx.state.iceView.rinkIds, el.dataset.id);
      redraw();
    },
    pick: (el) => {
      const s = ctx.state.iceSessions.find((x) => x.id === el.dataset.id);
      if (!s) return;
      s.pick = !s.pick;
      redraw();
    },
    "add-rink": () => openRinkSheet(ctx, null),
    "edit-rink": (el) => openRinkSheet(ctx, rinkOf(ctx, el.dataset.id)),
    "add-session": () => openSessionSheet(ctx, null),
    "edit-session": (el) => openSessionSheet(ctx, ctx.state.iceSessions.find((x) => x.id === el.dataset.id) || null),
    import: () => openImportSheet(ctx),
    "export-picks": () => {
      const picks = ctx.state.iceSessions.filter((s) => s.pick);
      if (!picks.length) return toast("Star a few sessions first, then you can add them to your calendar.", 4000);
      download("myskate-ice-picks.ics", buildIcs(picks, ctx.state.rinks), "text/calendar");
      toast("Calendar file saved. Open it to add your picks to your calendar.", 4500);
    },
  };
}

/* ---------- Sheets ---------- */

/* A sheet with a form: its buttons stay in view while the form scrolls. */
function formSheet(content, options) {
  const sheet = openSheet(content, options);
  sheet.dialog.classList.add("sheet--form");
  return sheet;
}

const showError = (sheet, message) => {
  const el = $(".status--warn", sheet.dialog);
  el.textContent = message;
  el.hidden = false;
};

function openRinkSheet(ctx, rink) {
  const { state } = ctx;
  if (!rink && state.rinks.length >= LIMITS.rinks) return toast(`MySkate holds up to ${LIMITS.rinks} rinks.`);
  const sheet = formSheet(
    html`<h2 class="sheet__title sheet__title--small">${rink ? "Edit rink" : "Add a rink"}</h2>
      <label class="field"><span>Rink name</span><input class="input" id="rk-name" type="text" maxlength="${LIMITS.name}" autocomplete="off" value="${rink ? rink.name : ""}" placeholder="Highland Ice Arena"></label>
      <label class="field"><span>City (optional)</span><input class="input" id="rk-city" type="text" maxlength="${LIMITS.city}" autocomplete="off" value="${rink ? rink.city : ""}" placeholder="Shoreline"></label>
      <label class="field"><span>Link to the rink's schedule page (optional)</span><input class="input" id="rk-url" type="url" inputmode="url" maxlength="${LIMITS.url}" autocomplete="off" value="${rink ? rink.url : ""}" placeholder="https://"></label>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot">
        ${rink ? html`<button class="chip chip--discard" type="button" id="rk-delete">Delete rink</button>` : html`<span></span>`}
        <div class="cluster"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="rk-save">Save</button></div>
      </div>`,
    { label: rink ? "Edit rink" : "Add a rink" }
  );
  const root = sheet.dialog;
  $("#rk-name", root).focus();
  $("#rk-save", root).addEventListener("click", () => {
    const name = $("#rk-name", root).value.trim();
    let url = $("#rk-url", root).value.trim();
    if (!name) return showError(sheet, "Give the rink a name.");
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    if (url && !sanitizeRink({ id: "x", name: "x", url }).url) return showError(sheet, "That link does not look right. It should start with https://");
    const clean = sanitizeRink({ id: rink ? rink.id : uid(), name, city: $("#rk-city", root).value.trim(), url, color: rink ? rink.color : nextRinkColor(state.rinks) });
    if (rink) Object.assign(rink, clean);
    else state.rinks.push(clean);
    ctx.save();
    sheet.close("saved");
    ctx.update();
    toast(rink ? "Rink saved." : `${clean.name} added. Now add its sessions.`);
  });
  const del = $("#rk-delete", root);
  if (del)
    del.addEventListener("click", async () => {
      const n = state.iceSessions.filter((s) => s.rinkId === rink.id).length;
      const ok = await confirmSheet({ title: `Delete ${rink.name}?`, message: n ? `Its ${plural(n, "session")} will be deleted too.` : "This rink has no sessions.", confirmLabel: "Delete" });
      if (!ok) return;
      state.rinks = state.rinks.filter((r) => r.id !== rink.id);
      state.iceSessions = state.iceSessions.filter((s) => s.rinkId !== rink.id);
      state.iceView.rinkIds = state.iceView.rinkIds.filter((id) => id !== rink.id);
      ctx.save();
      sheet.close("deleted");
      ctx.update();
    });
}

/* A session that repeats on several days becomes one session per day, so each day can be starred (or changed) on its own. */
function perDay(item) {
  if (item.date) return [{ ...item, days: [] }];
  return item.days.map((d) => ({ ...item, days: [d] }));
}

function openSessionSheet(ctx, existing) {
  const { state } = ctx;
  if (!state.rinks.length) {
    toast("Add a rink first.");
    return openRinkSheet(ctx, null);
  }
  const v = {
    kind: existing ? existing.kind : state.iceView.kinds.length === 1 ? state.iceView.kinds[0] : "freestyle",
    repeat: existing && existing.date ? "day" : "week",
    days: existing ? [...existing.days] : [],
    pick: existing ? existing.pick : false,
  };
  const rinkId = existing ? existing.rinkId : state.iceView.rinkIds.length === 1 ? state.iceView.rinkIds[0] : state.rinks[0].id;
  const sheet = formSheet(
    html`<h2 class="sheet__title sheet__title--small">${existing ? "Edit session" : "Add a session"}</h2>
      <label class="field"><span>Rink</span><select class="input" id="se-rink">${state.rinks.map((r) => html`<option value="${r.id}" ${r.id === rinkId ? "selected" : ""}>${r.name}</option>`)}</select></label>
      <div class="field"><span id="se-kind-l">Type</span><div class="limit-row" id="se-kind" role="group" aria-labelledby="se-kind-l">${KINDS.map((k) => html`<button class="chip" type="button" data-kind="${k.id}" aria-pressed="${k.id === v.kind}">${k.name}</button>`)}</div></div>
      <div class="field"><span id="se-rep-l">Repeats</span><div class="seg" id="se-rep" role="group" aria-labelledby="se-rep-l"><button type="button" data-repeat="week" aria-pressed="${v.repeat === "week"}">Every week</button><button type="button" data-repeat="day" aria-pressed="${v.repeat === "day"}">One day only</button></div></div>
      <div class="field" id="se-days-box"><span id="se-days-l">Days</span><div class="limit-row" id="se-days" role="group" aria-labelledby="se-days-l">${DAY_SHORT.map((d, i) => html`<button class="chip" type="button" data-day="${i + 1}" aria-pressed="${v.days.includes(i + 1)}" aria-label="${DAY_NAMES[i]}">${d}</button>`)}</div></div>
      <label class="field" id="se-date-box"><span>Date</span><input class="input" id="se-date" type="date" value="${existing && existing.date ? existing.date : todayISO()}"></label>
      <div class="two-fields">
        <label class="field"><span>Starts</span><input class="input" id="se-start" type="time" step="300" value="${existing ? existing.start : "14:00"}"></label>
        <label class="field"><span>Ends</span><input class="input" id="se-end" type="time" step="300" value="${existing ? existing.end : "15:00"}"></label>
      </div>
      <div class="two-fields">
        <label class="field"><span>Price (optional)</span><input class="input" id="se-price" type="number" inputmode="decimal" min="0" max="${LIMITS.price}" step="0.5" value="${existing && existing.price !== null ? existing.price : ""}" placeholder="18"></label>
        <label class="field"><span>Note (optional)</span><input class="input" id="se-note" type="text" maxlength="${LIMITS.note}" autocomplete="off" value="${existing ? existing.note : ""}" placeholder="Ice 2"></label>
      </div>
      <details class="note-box" id="se-dates-box" ${existing && (existing.from || existing.to) ? "open" : ""}>
        <summary>Only some weeks? Set dates</summary>
        <div class="two-fields">
          <label class="field"><span>From</span><input class="input" id="se-from" type="date" value="${existing && existing.from ? existing.from : ""}"></label>
          <label class="field"><span>Until</span><input class="input" id="se-to" type="date" value="${existing && existing.to ? existing.to : ""}"></label>
        </div>
        <p class="note">For a seasonal or holiday schedule. Leave both empty if it runs all year.</p>
      </details>
      <div class="limit-row"><button class="chip" type="button" id="se-pick" aria-pressed="${v.pick}">${icon("star")}Add to My picks</button></div>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot">
        ${existing ? html`<div class="cluster"><button class="chip chip--discard" type="button" id="se-delete">Delete</button><button class="chip" type="button" id="se-plan">Plan this</button></div>` : html`<span></span>`}
        <div class="cluster"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="se-save">Save</button></div>
      </div>`,
    { label: existing ? "Edit session" : "Add a session" }
  );
  const root = sheet.dialog;

  const pressOnly = (group, target) => $$("button", $(group, root)).forEach((b) => b.setAttribute("aria-pressed", String(b === target)));
  const syncRepeat = () => {
    $("#se-days-box", root).hidden = v.repeat !== "week";
    $("#se-dates-box", root).hidden = v.repeat !== "week";
    $("#se-date-box", root).hidden = v.repeat !== "day";
  };
  syncRepeat();

  $("#se-kind", root).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-kind]");
    if (!b) return;
    v.kind = b.dataset.kind;
    pressOnly("#se-kind", b);
  });
  $("#se-rep", root).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-repeat]");
    if (!b) return;
    v.repeat = b.dataset.repeat;
    pressOnly("#se-rep", b);
    syncRepeat();
  });
  $("#se-days", root).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-day]");
    if (!b) return;
    const d = Number(b.dataset.day);
    v.days = v.days.includes(d) ? v.days.filter((x) => x !== d) : [...v.days, d].sort((a, c) => a - c);
    b.setAttribute("aria-pressed", String(v.days.includes(d)));
  });
  $("#se-pick", root).addEventListener("click", (e) => {
    v.pick = !v.pick;
    e.currentTarget.setAttribute("aria-pressed", String(v.pick));
  });

  $("#se-save", root).addEventListener("click", () => {
    const start = $("#se-start", root).value;
    const end = $("#se-end", root).value;
    const date = $("#se-date", root).value;
    const from = $("#se-from", root).value;
    const to = $("#se-to", root).value;
    const priceText = $("#se-price", root).value.trim();
    const price = priceText === "" ? null : Number(priceText);
    if (!isTime(start) || !isTime(end)) return showError(sheet, "Pick a start time and an end time.");
    if (toMin(end) <= toMin(start)) return showError(sheet, "The end time has to be after the start time. For a session past midnight, add it as two sessions.");
    if (v.repeat === "week" && !v.days.length) return showError(sheet, "Tap the days this session runs.");
    if (v.repeat === "day" && !isDay(date)) return showError(sheet, "Pick the date.");
    if (v.repeat === "week" && from && to && from > to) return showError(sheet, "“From” has to be before “Until”.");
    if (price !== null && !(price >= 0 && price <= LIMITS.price)) return showError(sheet, `The price should be between 0 and ${LIMITS.price}.`);
    const base = { rinkId: $("#se-rink", root).value, kind: v.kind, start, end, price, note: $("#se-note", root).value.trim(), pick: v.pick };
    const made = (v.repeat === "day" ? perDay({ ...base, days: [], date, from: null, to: null }) : perDay({ ...base, days: v.days, date: null, from: from || null, to: to || null })).map((s) => sanitizeIceSession({ ...s, id: uid() }));
    if (made.some((s) => !s)) return showError(sheet, "Those details do not make a session. Check the days and times.");
    if (state.iceSessions.length - (existing ? 1 : 0) + made.length > LIMITS.sessions) return showError(sheet, `MySkate holds up to ${LIMITS.sessions} sessions.`);
    if (existing) {
      Object.assign(existing, { ...made[0], id: existing.id });
      state.iceSessions.push(...made.slice(1));
    } else {
      state.iceSessions.push(...made);
    }
    ctx.save();
    sheet.close("saved");
    ctx.update();
    toast(made.length > 1 ? `${made.length} sessions saved.` : "Session saved.");
  });

  const del = $("#se-delete", root);
  if (del) {
    del.addEventListener("click", async () => {
      const ok = await confirmSheet({ title: "Delete this session?", message: `${kindName(existing.kind)} at ${(rinkOf(ctx, existing.rinkId) || { name: "this rink" }).name}, ${existing.date ? fmtDate(existing.date) : dayList(existing.days)} ${rangeOf(existing)}. It disappears from every week.`, confirmLabel: "Delete" });
      if (!ok) return;
      state.iceSessions = state.iceSessions.filter((s) => s.id !== existing.id);
      ctx.save();
      sheet.close("deleted");
      ctx.update();
    });
    $("#se-plan", root).addEventListener("click", () => {
      state.plan.slotMin = slotFor(existing);
      ctx.save();
      sheet.close("plan");
      toast(`Your ice slot is now ${state.plan.slotMin} minutes. Pick what to work on.`, 4500);
      ctx.go("plan");
    });
  }
}

function openImportSheet(ctx) {
  const { state } = ctx;
  if (!state.rinks.length) {
    toast("Add a rink first, then import its calendar.");
    return openRinkSheet(ctx, null);
  }
  const sheet = formSheet(
    html`<h2 class="sheet__title sheet__title--small">Import a calendar file</h2>
      <p class="note">Some rinks, and Google or Apple Calendar, can save a schedule as a calendar file (.ics). MySkate reads it on this device and nothing is uploaded. A holiday closure inside the file is not read, so check the rink's page.</p>
      <label class="choice" for="ic-file"><strong>Pick a calendar file</strong><span class="note">A file that ends in .ics</span></label>
      <input id="ic-file" type="file" accept=".ics,text/calendar" hidden>
      <p class="status" id="ic-status" aria-live="polite"></p>
      <div class="stack" id="ic-preview" hidden>
        <label class="field"><span>Add them to</span><select class="input" id="ic-rink">${state.rinks.map((r) => html`<option value="${r.id}">${r.name}</option>`)}</select></label>
        <div class="card browse-list" id="ic-list"></div>
        <div class="limit-row"><button class="chip" type="button" id="ic-pick" aria-pressed="false">${icon("star")}Add them all to My picks</button></div>
      </div>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="ic-go" hidden>Add</button></div>`,
    { label: "Import a calendar file" }
  );
  const root = sheet.dialog;
  let found = [];
  const status = $("#ic-status", root);

  $("#ic-file", root).addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    $("#ic-preview", root).hidden = true;
    $("#ic-go", root).hidden = true;
    if (file.size > 2_000_000) {
      status.className = "status status--warn";
      status.textContent = "That file is too big to be a rink schedule.";
      return;
    }
    const result = parseIcs(await file.text());
    found = result.sessions.flatMap(perDay);
    if (!found.length) {
      status.className = "status status--warn";
      status.textContent = result.total ? "Nothing in that file could be used. All-day events, overnight events, and unusual repeats are left out." : "That does not look like a calendar file.";
      return;
    }
    const left = [result.skipped && `${plural(result.skipped, "event")} left out`, result.ended && `${plural(result.ended, "event")} already ended`].filter(Boolean).join(", ");
    status.className = "status status--ok";
    status.textContent = `Found ${plural(found.length, "session")}${left ? ` (${left})` : ""}.`;
    $("#ic-list", root).innerHTML = html`${found.slice(0, 40).map((s) => html`<div class="row"><span class="grow">${kindName(s.kind)} · ${s.date ? fmtDate(s.date) : DAY_NAMES[s.days[0] - 1]} · ${rangeOf(s)}${s.note ? html`<br><span class="dim">${s.note}</span>` : ""}</span></div>`)}${found.length > 40 ? html`<p class="dim">And ${found.length - 40} more.</p>` : ""}`.text;
    $("#ic-preview", root).hidden = false;
    $("#ic-go", root).hidden = false;
    $("#ic-go", root).textContent = `Add ${plural(found.length, "session")}`;
  });
  $("#ic-pick", root).addEventListener("click", (e) => e.currentTarget.setAttribute("aria-pressed", String(e.currentTarget.getAttribute("aria-pressed") !== "true")));
  $("#ic-go", root).addEventListener("click", () => {
    const rinkId = $("#ic-rink", root).value;
    const pick = $("#ic-pick", root).getAttribute("aria-pressed") === "true";
    const sig = (s) => JSON.stringify([s.rinkId, s.kind, s.days, s.date, s.start, s.end, s.from, s.to]);
    const have = new Set(state.iceSessions.map(sig));
    const fresh = found.map((s) => sanitizeIceSession({ ...s, id: uid(), rinkId, pick })).filter((s) => s && !have.has(sig(s)));
    const room = LIMITS.sessions - state.iceSessions.length;
    state.iceSessions.push(...fresh.slice(0, Math.max(0, room)));
    ctx.save();
    sheet.close("imported");
    ctx.update();
    const added = Math.min(fresh.length, Math.max(0, room));
    toast(added ? `Added ${plural(added, "session")} to ${rinkOf(ctx, rinkId).name}.${fresh.length > added ? " The rest did not fit." : ""}` : "You already had all of those.", 4500);
  });
}
