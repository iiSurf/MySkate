/* First run: your name and skates, your level, your usual ice slot, or restore a backup file. */

import { html } from "../util.js";
import { openSheet, $, $$ } from "./dom.js";
import { parseBackup, replaceState } from "../store.js";
import { SLOTS } from "../plan.js";
import { medallion } from "./parts.js";

/* Level choices for a select. kind is "skills" or "jumps". */
export function levelOptions(catalog, kind, selected) {
  const ids = kind === "skills" ? ["lts-basic", "lts-freeskate", "lts-adult", "usfs-skating-skills"] : ["lts-basic", "lts-freeskate"];
  const groups = ids
    .map((id) => catalog.tracks.find((t) => t.id === id))
    .filter(Boolean)
    .map(
      (t) => html`<optgroup label="${t.name}">${t.levels.map((l) => html`<option value="${t.id}/${l.id}" ${selected === `${t.id}/${l.id}` ? "selected" : ""}>${l.name.replace(/ Skating Skills$/, "")}</option>`)}</optgroup>`
    );
  if (kind === "jumps") groups.push(html`<optgroup label="Beyond the levels"><option value="library" ${selected === "library" ? "selected" : ""}>Jump and spin library (doubles, triples, Axels)</option></optgroup>`);
  return groups;
}

const LIMIT_CHOICES = [20, 25, 30, 35];

export function runOnboarding(ctx) {
  const { state, catalog } = ctx;
  return new Promise((resolve) => {
    const sheet = openSheet(
      html`
      <div data-step="0">
        <p class="eyebrow">Welcome</p>
        <h2 class="sheet__title">Let's set up your ice</h2>
        <p class="note">Everything stays on this device. Choose how to start.</p>
        <div class="choices">
          <button class="choice choice--primary" type="button" data-go="1"><strong>Set up my skates</strong><span class="note">Takes about a minute.</span></button>
          <label class="choice" for="ob-file"><strong>Restore a backup</strong><span class="note">Pick a MySkate backup file (JSON) and carry on where you left off.</span></label>
          <input id="ob-file" type="file" accept=".json,application/json" hidden>
          <p class="status" id="ob-status" aria-live="polite"></p>
          <button class="btn btn--gold btn--small" type="button" id="ob-restore" hidden>Restore this backup</button>
          <button class="chip" type="button" id="ob-skip">I'll set up later</button>
        </div>
      </div>

      <div data-step="1" hidden>
        <p class="eyebrow">Step 1 of 4</p>
        <h2 class="sheet__title">You and your skates</h2>
        <label class="field"><span>What should MySkate call you? (optional)</span><input class="input" id="ob-name" type="text" maxlength="40" autocomplete="given-name" placeholder="Your first name"></label>
        <label class="field"><span>Skate and blade names (optional)</span><input class="input" id="ob-skates" type="text" maxlength="80" autocomplete="off" placeholder="Edea Piano with Gold Seal blades"></label>
        <div class="field">
          <span id="ob-limit-label">Sharpen after</span>
          <div class="limit-row" id="ob-limit" role="group" aria-labelledby="ob-limit-label">
            ${LIMIT_CHOICES.map((h) => html`<button class="chip" type="button" data-h="${h}" aria-pressed="${h === 25}">${h} h</button>`)}
            <input class="input input--num" id="ob-limit-custom" type="number" inputmode="numeric" min="5" max="100" value="25" aria-label="Custom number of hours">
          </div>
        </div>
        <label class="field"><span>Hours on your blades since the last sharpening</span><input class="input input--num" id="ob-since" type="number" inputmode="decimal" min="0" max="500" step="0.25" value="0"></label>
        <p class="note">Most skaters sharpen between 20 and 35 hours. You can change this any time from the blade tile on Home.</p>
      </div>

      <div data-step="2" hidden>
        <p class="eyebrow">Step 2 of 4</p>
        <h2 class="sheet__title">Your level</h2>
        <label class="field"><span>Skating skills</span><select class="input" id="ob-skills">${levelOptions(catalog, "skills", state.profile.levels.skills)}</select></label>
        <label class="field"><span>Jumps and spins</span><select class="input" id="ob-jumps">${levelOptions(catalog, "jumps", state.profile.levels.jumps)}</select></label>
        <p class="note">Pick where you are working now. MySkate suggests what to try next, and you can change this any time.</p>
      </div>

      <div data-step="3" hidden>
        <p class="eyebrow">Step 3 of 4</p>
        <h2 class="sheet__title">Your ice time</h2>
        <div class="field">
          <span id="ob-slot-label">Your usual slot, in minutes</span>
          <div class="limit-row" id="ob-slot" role="group" aria-labelledby="ob-slot-label">${SLOTS.map((m) => html`<button class="chip" type="button" data-min="${m}" aria-pressed="${m === 60}">${m}</button>`)}</div>
        </div>
        <p class="note">New plans start with this slot. You can pick a different one every time.</p>
      </div>

      <div data-step="4" hidden class="done">
        ${medallion(1, "level--xl")}
        <h2 class="sheet__title">You're set</h2>
        <p class="note" id="ob-summary"></p>
      </div>

      <div class="sheet__foot" id="ob-foot" hidden>
        <button class="btn btn--glass btn--small" type="button" id="ob-back">Back</button>
        <div class="dots" id="ob-dots" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i><i></i></div>
        <button class="btn btn--small" type="button" id="ob-next">Next</button>
      </div>`,
      { label: "Welcome to MySkate", dismissible: false }
    );

    const root = sheet.dialog;
    const steps = $$("[data-step]", root);
    const dots = $$("#ob-dots i", root);
    let step = 0;
    let restored = null;

    const pressed = (group) => $("button[aria-pressed='true']", $(group, root));

    function show(n) {
      step = n;
      steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
      dots.forEach((d, i) => d.classList.toggle("on", i === n));
      $("#ob-foot", root).hidden = n === 0;
      $("#ob-next", root).textContent = n === 4 ? "Start skating" : "Next";
      if (n === 4) {
        const limit = pressed("#ob-limit");
        const skills = $("#ob-skills", root);
        $("#ob-summary", root).textContent = `Sharpen after ${limit ? limit.dataset.h : $("#ob-limit-custom", root).value} hours, ${$("#ob-since", root).value || 0} hours so far. Working on ${skills.options[skills.selectedIndex].textContent}. Usual slot: ${pressed("#ob-slot").dataset.min} minutes.`;
      }
      const first = $("input, select", steps[n]);
      if (first && n > 0) first.focus({ preventScroll: true });
    }

    function pressOne(group, target) {
      $$("button", $(group, root)).forEach((b) => b.setAttribute("aria-pressed", String(b === target)));
    }

    function finish(values) {
      const s = ctx.state;
      if (values) {
        s.profile.name = values.name;
        s.profile.levels = { skills: values.skills, jumps: values.jumps };
        s.profile.defaultSlotMin = values.slot;
        s.plan.slotMin = values.slot;
        s.blades = { name: values.skates, limitHours: values.limit, baseHours: values.since, countedFrom: new Date().toISOString() };
      }
      s.profile.onboarded = true;
      ctx.save();
      sheet.close("done");
    }

    $("[data-go='1']", root).addEventListener("click", () => show(1));
    $("#ob-back", root).addEventListener("click", () => show(Math.max(1, step - 1)));
    $("#ob-next", root).addEventListener("click", () => {
      if (step < 4) return show(step + 1);
      const limit = Number($("#ob-limit-custom", root).value);
      finish({
        name: $("#ob-name", root).value.trim().slice(0, 40),
        skates: $("#ob-skates", root).value.trim().slice(0, 80),
        limit: limit >= 5 && limit <= 100 ? limit : 25,
        since: Math.max(0, Number($("#ob-since", root).value) || 0),
        skills: $("#ob-skills", root).value,
        jumps: $("#ob-jumps", root).value,
        slot: Number(pressed("#ob-slot").dataset.min),
      });
    });
    $("#ob-skip", root).addEventListener("click", () => finish(null));

    $("#ob-limit", root).addEventListener("click", (e) => {
      const chip = e.target.closest("button.chip");
      if (!chip) return;
      pressOne("#ob-limit", chip);
      $("#ob-limit-custom", root).value = chip.dataset.h;
    });
    $("#ob-limit-custom", root).addEventListener("input", (e) => {
      $$("#ob-limit button", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.h === e.target.value)));
    });
    $("#ob-slot", root).addEventListener("click", (e) => {
      const chip = e.target.closest("button.chip");
      if (chip) pressOne("#ob-slot", chip);
    });

    $("#ob-file", root).addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const result = parseBackup(await file.text());
      e.target.value = "";
      const status = $("#ob-status", root);
      const restoreBtn = $("#ob-restore", root);
      if (!result.ok) {
        restored = null;
        restoreBtn.hidden = true;
        status.className = "status status--warn";
        status.textContent = result.error;
        return;
      }
      restored = result;
      const { sessions, first, last } = result.summary;
      status.className = "status status--ok";
      status.textContent = `Found ${sessions} ${sessions === 1 ? "session" : "sessions"}${first ? `, ${first} to ${last}` : ""}.`;
      restoreBtn.hidden = false;
    });
    $("#ob-restore", root).addEventListener("click", () => {
      if (!restored) return;
      ctx.setState(replaceState(restored.state, ctx.state));
      ctx.save();
      sheet.close("restored");
    });

    sheet.closed.then(resolve);
  });
}
