/* A sheet for finding any skill in the catalog by track and level, or by searching its name. */

import { html, esc } from "../util.js";
import { openSheet, $ } from "./dom.js";
import { levelSkillIds } from "../catalog.js";

/* options: title, isOn(id), toggle(id), countText(), startKey (a level key to open on). Returns the sheet. */
export function openPicker(ctx, { title, isOn, toggle, countText, startKey }) {
  const { catalog } = ctx;
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">${title}</h2>
      <div class="two-fields">
        <label class="field"><span>Track</span><select class="input" id="b-track">${catalog.tracks.map((t) => html`<option value="${t.id}">${t.name}</option>`)}</select></label>
        <label class="field"><span>Level</span><select class="input" id="b-level"></select></label>
      </div>
      <label class="field"><span>Or search every skill</span><input class="input" id="b-q" type="search" placeholder="Axel, crossovers, spin" autocomplete="off"></label>
      <div class="card browse-list" id="b-list" aria-live="polite"></div>
      <div class="sheet__foot"><span class="note" id="b-count"></span><button class="btn btn--small" type="button" data-close="done">Done</button></div>`,
    { label: title }
  );
  const root = sheet.dialog;
  const track = $("#b-track", root);
  const level = $("#b-level", root);
  const query = $("#b-q", root);
  const list = $("#b-list", root);

  function fillLevels() {
    const t = catalog.tracks.find((x) => x.id === track.value);
    level.innerHTML = t.levels.map((l) => `<option value="${t.id}/${l.id}">${esc(l.name.replace(/ Skating Skills$/, ""))}</option>`).join("");
  }

  function count() {
    $("#b-count", root).textContent = countText();
  }

  function paint() {
    const q = query.value.trim().toLowerCase();
    const ids = q
      ? [...catalog.skills.values()].filter((s) => s.name.toLowerCase().includes(q) || s.trackName.toLowerCase().includes(q)).slice(0, 40).map((s) => s.id)
      : levelSkillIds(catalog, level.value, { bonus: true });
    list.innerHTML = ids.length
      ? ids
          .map((id) => {
            const sk = catalog.skills.get(id);
            const where = q ? `<span class="dim"> ${esc(sk.levelName.replace(/ Skating Skills$/, ""))}</span>` : "";
            return `<div class="row row--pick" role="checkbox" tabindex="0" aria-checked="${isOn(id)}" data-id="${esc(id)}"><span class="tick" aria-hidden="true"><svg class="ic"><use href="#i-check"/></svg></span><span class="grow">${esc(sk.name)}${where}</span></div>`;
          })
          .join("")
      : '<p class="dim">No skills match.</p>';
    count();
  }

  function press(row) {
    toggle(row.dataset.id);
    row.setAttribute("aria-checked", String(isOn(row.dataset.id)));
    count();
  }

  track.addEventListener("change", () => {
    fillLevels();
    paint();
  });
  level.addEventListener("change", paint);
  query.addEventListener("input", paint);
  list.addEventListener("click", (e) => {
    const row = e.target.closest(".row--pick");
    if (row) press(row);
  });
  list.addEventListener("keydown", (e) => {
    const row = e.target.closest(".row--pick");
    if (row && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      press(row);
    }
  });

  const key = startKey || ctx.state.profile.levels.skills;
  const startTrack = key.split("/")[0];
  if (catalog.tracks.some((t) => t.id === startTrack)) track.value = startTrack;
  fillLevels();
  if ([...level.options].some((o) => o.value === key)) level.value = key;
  paint();
  return sheet;
}
