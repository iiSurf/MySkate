/* The competition planner's sheets: a competition, a program, and (as the planner grows) an element, a moment, a day item. */

import { html, uid, todayISO } from "../util.js";
import { openSheet, confirmSheet, toast, $, $$ } from "./dom.js";
import { pickSkill } from "./skillpick.js";
import { keepAwake } from "../wake.js";
import { fmtTime as clockText } from "../ice.js";
import {
  newEvent, newProgram, sanitizeDayItem, sanitizeEvent, addElement, updateElement, removeElement, addMoment, cueAt, roman,
  KINDS, ELEMENT_TYPES, LIMITS, DEFAULT_LENGTH, fmtMmSs, parseMmSs,
} from "../compete.js";
import { fmtDate } from "../util.js";

/* Save a changed program in the saved data. */
export function replaceProgram(ctx, next) {
  ctx.state.programs = ctx.state.programs.map((p) => (p.id === next.id ? next : p));
  ctx.save();
}

const failer = (root) => {
  const warn = $(".status--warn", root);
  return (m) => {
    warn.textContent = m;
    warn.hidden = false;
  };
};

/* A competition: its name, its day, and where. Resolves to its id when saved, or "" when cancelled. */
export async function openEventSheet(ctx, event = null) {
  const editing = Boolean(event);
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">${editing ? "Edit competition" : "New competition"}</h2>
      <label class="field"><span>Name</span><input class="input" id="ev-name" type="text" maxlength="${LIMITS.name}" value="${event ? event.name : ""}" placeholder="Fall Classic" autocomplete="off"></label>
      <label class="field"><span>Day</span><input class="input" id="ev-date" type="date" value="${event ? event.date : ""}"></label>
      <label class="field"><span>Where (optional)</span><input class="input" id="ev-place" type="text" maxlength="${LIMITS.name}" value="${event ? event.place : ""}" placeholder="Highland Ice Arena" autocomplete="off"></label>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="ev-save">Save</button></div>`,
    { label: editing ? "Edit competition" : "New competition", sticky: true }
  );
  const root = sheet.dialog;
  const fail = failer(root);
  $("#ev-name", root).focus();
  let savedId = "";
  $("#ev-save", root).addEventListener("click", () => {
    const date = $("#ev-date", root).value;
    if (!date) return fail("Pick the day of the competition.");
    const fields = { name: $("#ev-name", root).value, date, place: $("#ev-place", root).value };
    if (editing) {
      ctx.state.events = ctx.state.events.map((e) => (e.id === event.id ? sanitizeEvent({ ...e, ...fields }) || e : e));
      savedId = event.id;
    } else {
      if (ctx.state.events.length >= LIMITS.events) return fail(`MySkate holds up to ${LIMITS.events} competitions. Remove an old one first.`);
      const made = newEvent(fields, uid);
      if (!made) return fail("That day did not work. Pick it again.");
      ctx.state.events = [...ctx.state.events, made];
      savedId = made.id;
    }
    ctx.save();
    sheet.close("saved");
  });
  await sheet.closed;
  return savedId;
}

/* A program: its name, music, length, kind, and which competition it is for. Resolves to its id when saved, or "". */
export async function openProgramSheet(ctx, { eventId = "" } = {}) {
  let kind = "free";
  const events = [...ctx.state.events].sort((a, b) => a.date.localeCompare(b.date));
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">New program</h2>
      <label class="field"><span>Name</span><input class="input" id="pg-name" type="text" maxlength="${LIMITS.name}" placeholder="Moonlight" autocomplete="off"></label>
      <label class="field"><span>Music (optional)</span><input class="input" id="pg-title" type="text" maxlength="${LIMITS.text}" placeholder="Clair de Lune" autocomplete="off"></label>
      <label class="field"><span>Composer or artist (optional)</span><input class="input" id="pg-artist" type="text" maxlength="${LIMITS.text}" placeholder="Debussy" autocomplete="off"></label>
      <label class="field"><span>Length, like 1:30</span><input class="input input--num" id="pg-length" type="text" inputmode="numeric" value="${fmtMmSs(DEFAULT_LENGTH)}" autocomplete="off"></label>
      <div class="field"><span id="pg-kind-l">Kind</span><div class="limit-row" id="pg-kind" role="group" aria-labelledby="pg-kind-l">${KINDS.map((k) => html`<button class="chip" type="button" data-kind="${k.id}" aria-pressed="${k.id === kind}">${k.name}</button>`)}</div></div>
      <label class="field"><span>Competition</span><select class="input" id="pg-event"><option value="">Not yet</option>${events.map((e) => html`<option value="${e.id}" ${e.id === eventId ? "selected" : ""}>${e.name} · ${fmtDate(e.date, { month: "short", day: "numeric", year: "numeric" })}</option>`)}</select></label>
      <p class="note">Your event decides the length and what is required. Check its rules and ask your coach. MySkate only keeps your plan.</p>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="pg-save">Start choreographing</button></div>`,
    { label: "New program", sticky: true }
  );
  const root = sheet.dialog;
  const fail = failer(root);
  $("#pg-name", root).focus();
  $("#pg-kind", root).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-kind]");
    if (!b) return;
    kind = b.dataset.kind;
    $$("button", $("#pg-kind", root)).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  let savedId = "";
  $("#pg-save", root).addEventListener("click", () => {
    const lengthSec = parseMmSs($("#pg-length", root).value);
    if (lengthSec === null || lengthSec < LIMITS.lengthMin || lengthSec > LIMITS.lengthMax) return fail(`Enter a length like 1:30, between ${fmtMmSs(LIMITS.lengthMin)} and ${fmtMmSs(LIMITS.lengthMax)}.`);
    if (ctx.state.programs.length >= LIMITS.programs) return fail(`MySkate holds up to ${LIMITS.programs} programs. Remove an old one first.`);
    const made = newProgram({ name: $("#pg-name", root).value, music: { title: $("#pg-title", root).value, artist: $("#pg-artist", root).value }, lengthSec, kind, eventId: $("#pg-event", root).value }, uid, todayISO());
    ctx.state.programs = [...ctx.state.programs, made];
    ctx.save();
    savedId = made.id;
    sheet.close("saved");
  });
  await sheet.closed;
  return savedId;
}

/* An element of a program: add one (on a spot you tapped, or one MySkate picks) or edit one. Resolves to its id when saved, or "". */
export async function openElementSheet(ctx, { programId, elementId = null, x = null, y = null, type = "move" }) {
  const program = ctx.state.programs.find((p) => p.id === programId);
  if (!program) return "";
  const existing = elementId ? program.elements.find((e) => e.id === elementId) : null;
  let kind = existing ? existing.type : type;
  let skillId = existing ? existing.skillId : "";
  const skillName = () => (skillId && ctx.catalog.skills.has(skillId) ? ctx.catalog.skills.get(skillId).name : "");
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">${existing ? "Edit element" : "Add an element"}</h2>
      <label class="field"><span>Name</span><input class="input" id="el-name" type="text" maxlength="${LIMITS.name}" value="${existing ? existing.label : ""}" placeholder="Waltz jump" autocomplete="off"></label>
      <div class="field"><span id="el-type-l">Kind</span><div class="limit-row" id="el-type" role="group" aria-labelledby="el-type-l">${ELEMENT_TYPES.map((t) => html`<button class="chip" type="button" data-type="${t.id}" aria-pressed="${t.id === kind}">${t.name}</button>`)}</div></div>
      <div class="field"><span id="el-skill-l">One of your skills (optional)</span><div class="cluster"><button class="btn btn--glass btn--small" type="button" id="el-skill" aria-labelledby="el-skill-l el-skill">${skillName() || "Choose a skill"}</button><button class="chip" type="button" id="el-skill-clear" ${skillId ? "" : "hidden"}>Clear</button></div></div>
      <p class="note">A linked skill shows your latest rating, and counts toward how many of the program's skills you have earned.</p>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot">${existing ? html`<button class="btn btn--coral btn--small" type="button" id="el-remove">Remove</button>` : html`<button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button>`}<button class="btn btn--small" type="button" id="el-save">${existing ? "Save" : "Add"}</button></div>`,
    { label: existing ? "Edit element" : "Add an element", sticky: true }
  );
  const root = sheet.dialog;
  const fail = failer(root);
  const name = $("#el-name", root);
  name.focus();
  $("#el-type", root).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-type]");
    if (!b) return;
    kind = b.dataset.type;
    $$("button", $("#el-type", root)).forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
  });
  $("#el-skill", root).addEventListener("click", async () => {
    const id = await pickSkill(ctx, { title: "A skill for this element" });
    if (!id) return;
    const sk = ctx.catalog.skills.get(id);
    skillId = id;
    $("#el-skill", root).textContent = sk.name;
    $("#el-skill-clear", root).hidden = false;
    if (!name.value.trim()) name.value = sk.name.slice(0, LIMITS.name);
    kind = sk.cat === "jumps" ? "jump" : sk.cat === "spins" ? "spin" : kind;
    $$("button", $("#el-type", root)).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.type === kind)));
  });
  $("#el-skill-clear", root).addEventListener("click", (e) => {
    skillId = "";
    $("#el-skill", root).textContent = "Choose a skill";
    e.currentTarget.hidden = true;
  });
  let savedId = "";
  $("#el-save", root).addEventListener("click", () => {
    const label = name.value.trim() || skillName();
    if (!label) return fail("Give the element a name, or choose one of your skills.");
    if (existing) {
      replaceProgram(ctx, updateElement(program, existing.id, { label, type: kind, skillId }));
      savedId = existing.id;
    } else {
      const made = addElement(program, { label, type: kind, skillId, x, y }, uid);
      if (made.status === "full") return fail(`A program holds up to ${LIMITS.elements} elements.`);
      if (made.status !== "added") return fail("That did not work. Try another name.");
      replaceProgram(ctx, made.program);
      savedId = made.element.id;
    }
    sheet.close("saved");
  });
  const remove = $("#el-remove", root);
  if (remove) {
    remove.addEventListener("click", async () => {
      if (!(await confirmSheet({ title: "Remove this element?", message: `${existing.label} comes out of the program, with its place on the rink and its time in the music.`, confirmLabel: "Remove" }))) return;
      replaceProgram(ctx, removeElement(program, existing.id));
      savedId = "removed";
      sheet.close("saved");
    });
  }
  await sheet.closed;
  return savedId;
}

/* A note on the music: "the music swells", at a time. Resolves true when added. */
export async function openMomentSheet(ctx, programId) {
  const program = ctx.state.programs.find((p) => p.id === programId);
  if (!program) return false;
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">A note on the music</h2>
      <label class="field"><span>When, like 0:30</span><input class="input input--num" id="mo-at" type="text" inputmode="numeric" value="0:30" autocomplete="off"></label>
      <label class="field"><span>What happens</span><input class="input" id="mo-text" type="text" maxlength="${LIMITS.text}" placeholder="The music swells" autocomplete="off"></label>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="mo-save">Add</button></div>`,
    { label: "A note on the music", sticky: true }
  );
  const root = sheet.dialog;
  const fail = failer(root);
  $("#mo-text", root).focus();
  let added = false;
  $("#mo-save", root).addEventListener("click", () => {
    const at = parseMmSs($("#mo-at", root).value);
    if (at === null || at > program.lengthSec) return fail(`Enter a time like 0:30, inside the music (up to ${fmtMmSs(program.lengthSec)}).`);
    const made = addMoment(program, { at, text: $("#mo-text", root).value }, uid);
    if (made.status === "full") return fail(`A program holds up to ${LIMITS.moments} notes.`);
    if (made.status !== "added") return fail("Write what happens at that moment.");
    replaceProgram(ctx, made.program);
    added = true;
    sheet.close("saved");
  });
  await sheet.closed;
  return added;
}

/* A run-through: a clock that counts up through the music, calling out the element on now and the next one coming. It plays no
   music (that is yours); it just keeps the time. */
export function openRunThrough(ctx, programId) {
  const program = ctx.state.programs.find((p) => p.id === programId);
  if (!program) return Promise.resolve();
  const number = (e) => roman(program.elements.indexOf(e) + 1);
  const sheet = openSheet(
    html`<p class="eyebrow">Run it through</p>
      <h2 class="sheet__title sheet__title--small">${program.name}</h2>
      <p class="rt-clock num" id="rt-clock" aria-live="off">0:00</p>
      <div class="bar bar--xp" role="progressbar" aria-valuemin="0" aria-valuemax="${program.lengthSec}" aria-valuenow="0" aria-label="Time through the program" id="rt-bar"><i style="--v:0%;--vn:1"></i></div>
      <p class="rt-now" id="rt-now" aria-live="polite">Start your music, then press Start here. Or use this as a clock on its own.</p>
      <p class="note" id="rt-next"></p>
      <div class="cluster"><button class="btn" type="button" id="rt-go">Start</button><button class="btn btn--glass btn--small" type="button" id="rt-reset">Start again</button></div>
      <div class="sheet__foot"><span class="note">${fmtMmSs(program.lengthSec)} of music</span><button class="btn btn--glass btn--small" type="button" data-close="done">Close</button></div>`,
    { label: "Run it through" }
  );
  const root = sheet.dialog;
  let started = 0;
  let acc = 0;
  let timer = null;
  const elapsed = () => (timer ? acc + (Date.now() - started) / 1000 : acc);
  const paint = () => {
    const t = Math.min(program.lengthSec, elapsed());
    $("#rt-clock", root).textContent = fmtMmSs(Math.floor(t));
    const pct = (t / program.lengthSec) * 100;
    const fill = $("#rt-bar i", root);
    fill.style.setProperty("--v", pct + "%");
    fill.style.setProperty("--vn", String(Math.max(1, pct)));
    $("#rt-bar", root).setAttribute("aria-valuenow", String(Math.floor(t)));
    if (t >= program.lengthSec) {
      stop();
      $("#rt-now", root).textContent = "That's the program. Take a breath.";
      $("#rt-next", root).textContent = "";
      $("#rt-go", root).textContent = "Start";
      return;
    }
    const cue = cueAt(program, t);
    $("#rt-now", root).textContent = cue.now ? `${number(cue.now)}. ${cue.now.label}` : "Between elements";
    $("#rt-next", root).textContent = cue.next ? `Next: ${cue.next.label} in ${fmtMmSs(Math.ceil(cue.untilNext))}` : "No more elements after this.";
  };
  function stop() {
    if (!timer) return;
    acc = elapsed();
    clearInterval(timer);
    timer = null;
    keepAwake(Boolean(ctx.state.active && ctx.state.active.running));
  }
  $("#rt-go", root).addEventListener("click", (e) => {
    if (timer) {
      stop();
      e.currentTarget.textContent = "Resume";
      return;
    }
    if (acc >= program.lengthSec) acc = 0;
    started = Date.now();
    timer = setInterval(paint, 200);
    keepAwake(true);
    e.currentTarget.textContent = "Pause";
    paint();
  });
  $("#rt-reset", root).addEventListener("click", () => {
    stop();
    acc = 0;
    $("#rt-go", root).textContent = "Start";
    paint();
  });
  return sheet.closed.then(() => stop());
}

/* One thing in a competition's day: check-in, warm-up, the Zamboni, your skate. Add or edit; edit has Remove. Resolves true when changed. */
export async function openDayItemSheet(ctx, eventId, itemId = null) {
  const event = ctx.state.events.find((e) => e.id === eventId);
  if (!event) return false;
  const item = itemId ? event.day.find((d) => d.id === itemId) : null;
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">${item ? "Edit this part of the day" : "Add to the day"}</h2>
      <label class="field"><span>What</span><input class="input" id="di-label" type="text" maxlength="${LIMITS.name}" value="${item ? item.label : ""}" placeholder="Warm-up, group 2" autocomplete="off"></label>
      <label class="field"><span>Time</span><input class="input" id="di-time" type="time" value="${item ? item.time : ""}"></label>
      <label class="field"><span>How many minutes (optional)</span><input class="input input--num" id="di-mins" type="number" inputmode="numeric" min="0" max="600" value="${item && item.mins ? item.mins : ""}"></label>
      <label class="field field--check"><span><input type="checkbox" id="di-mine" ${item && item.mine ? "checked" : ""}> This is my skate</span></label>
      <p class="note">Use the times your event posts. A part called Zamboni gets its yellow and black stripes.</p>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot">${item ? html`<button class="btn btn--coral btn--small" type="button" id="di-remove">Remove</button>` : html`<button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button>`}<button class="btn btn--small" type="button" id="di-save">${item ? "Save" : "Add"}</button></div>`,
    { label: item ? "Edit this part of the day" : "Add to the day", sticky: true }
  );
  const root = sheet.dialog;
  const fail = failer(root);
  $("#di-label", root).focus();
  let changed = false;
  const store = (day) => {
    ctx.state.events = ctx.state.events.map((e) => (e.id === eventId ? { ...e, day } : e));
    ctx.save();
    changed = true;
    sheet.close("saved");
  };
  $("#di-save", root).addEventListener("click", () => {
    const made = sanitizeDayItem({ id: item ? item.id : uid(), label: $("#di-label", root).value, time: $("#di-time", root).value, mins: Number($("#di-mins", root).value) || 0, mine: $("#di-mine", root).checked });
    if (!made) return fail("Give it a name and a time.");
    if (!item && event.day.length >= LIMITS.day) return fail(`A day holds up to ${LIMITS.day} parts.`);
    store(item ? event.day.map((d) => (d.id === item.id ? made : d)) : [...event.day, made]);
  });
  const remove = $("#di-remove", root);
  if (remove) remove.addEventListener("click", () => store(event.day.filter((d) => d.id !== item.id)));
  await sheet.closed;
  return changed;
}

export { clockText };
