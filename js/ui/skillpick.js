/* A sheet for choosing one skill from the whole catalog by searching its name (or, with nothing typed, from your own levels). */

import { html, esc } from "../util.js";
import { openSheet, $ } from "./dom.js";
import { catDot } from "./parts.js";
import { levelSkillIds, levelLabel } from "../catalog.js";

/* Resolves to the chosen skill's id, or null if the skater cancels. */
export function pickSkill(ctx, { title = "Choose a skill" } = {}) {
  const { catalog, state } = ctx;
  return new Promise((resolve) => {
    let chosen = null;
    const sheet = openSheet(
      html`<h2 class="sheet__title sheet__title--small">${title}</h2>
        <label class="field"><span>Search every skill</span><input class="input" id="sp-q" type="search" placeholder="Axel, crossovers, spin" autocomplete="off"></label>
        <div class="card browse-list" id="sp-list" aria-live="polite"></div>
        <div class="sheet__foot"><span></span><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button></div>`,
      { label: title, sticky: true }
    );
    const root = sheet.dialog;
    const query = $("#sp-q", root);
    const list = $("#sp-list", root);
    const mine = [...new Set([state.profile.levels.skills, state.profile.levels.jumps])].filter((k) => catalog.levels.has(k)).flatMap((k) => levelSkillIds(catalog, k, { bonus: true }));

    function paint() {
      const q = query.value.trim().toLowerCase();
      const ids = q ? [...catalog.skills.values()].filter((s) => s.name.toLowerCase().includes(q) || s.trackName.toLowerCase().includes(q)).slice(0, 40).map((s) => s.id) : mine.slice(0, 40);
      list.innerHTML = ids.length
        ? ids
            .map((id) => {
              const sk = catalog.skills.get(id);
              return `<div class="row row--pick" role="button" tabindex="0" data-id="${esc(id)}">${catDot(sk.cat).text}<span class="grow">${esc(sk.name)}<br><span class="dim">${esc(levelLabel(catalog, sk.levelKey))}</span></span></div>`;
            })
            .join("")
        : '<p class="dim">No skills match.</p>';
    }
    function choose(row) {
      chosen = row.dataset.id;
      sheet.close("pick");
    }
    query.addEventListener("input", paint);
    list.addEventListener("click", (e) => {
      const row = e.target.closest(".row--pick");
      if (row) choose(row);
    });
    list.addEventListener("keydown", (e) => {
      const row = e.target.closest(".row--pick");
      if (row && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        choose(row);
      }
    });
    paint();
    query.focus();
    sheet.closed.then(() => resolve(chosen));
  });
}
