/* The sheet for logging off-ice work: what kind, how long, which day, and a note. */

import { html, uid, todayISO } from "../util.js";
import { openSheet, toast, $, $$ } from "./dom.js";
import { OFF_KINDS, addOffIce, MIN_MIN, MAX_MIN, MAX_NOTE } from "../office.js";

const QUICK = [15, 30, 45, 60];

export function openOffIceSheet(ctx) {
  let kind = "strength";
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">Log off-ice work</h2>
      <div class="field"><span id="of-kind-l">What did you do?</span><div class="limit-row" id="of-kind" role="group" aria-labelledby="of-kind-l">${OFF_KINDS.map((k) => html`<button class="chip" type="button" data-kind="${k.id}" aria-pressed="${k.id === kind}">${k.name}</button>`)}</div></div>
      <div class="field"><span id="of-min-l">Minutes</span><div class="limit-row" role="group" aria-labelledby="of-min-l">${QUICK.map((m) => html`<button class="chip" type="button" data-min="${m}" aria-pressed="false">${m}</button>`)}<input class="input input--num" id="of-min" type="number" inputmode="numeric" min="${MIN_MIN}" max="${MAX_MIN}" step="5" value="30" aria-label="Minutes"></div></div>
      <label class="field"><span>Day</span><input class="input" id="of-date" type="date" max="${todayISO()}" value="${todayISO()}"></label>
      <label class="field"><span>Note (optional)</span><input class="input" id="of-note" type="text" maxlength="${MAX_NOTE}" autocomplete="off" placeholder="Hip openers and calf raises"></label>
      <p class="note">Off-ice work does not change your XP or your streak. It counts toward badges and shows on the calendar.</p>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="of-save">Save</button></div>`,
    { label: "Log off-ice work", sticky: true }
  );
  const root = sheet.dialog;
  const warn = $(".status--warn", root);
  $("#of-kind", root).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-kind]");
    if (!b) return;
    kind = b.dataset.kind;
    $$("button", $("#of-kind", root)).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-min]");
    if (!b) return;
    $("#of-min", root).value = b.dataset.min;
  });
  $("#of-save", root).addEventListener("click", async () => {
    const result = addOffIce(ctx.state.offIce, { date: $("#of-date", root).value, kind, minutes: $("#of-min", root).value, note: $("#of-note", root).value }, uid(), todayISO());
    const message = {
      invalid: `Pick a real day and between ${MIN_MIN} and ${MAX_MIN} minutes.`,
      future: "That day has not come yet. Pick today or an earlier day.",
      full: "MySkate holds up to 1000 off-ice workouts. Delete some old ones first.",
    }[result.status];
    if (message) {
      warn.textContent = message;
      warn.hidden = false;
      return;
    }
    ctx.state.offIce = result.list;
    ctx.save();
    sheet.close("saved");
    ctx.update();
    toast("Off-ice work logged.");
    await ctx.cheer({ scene: "check", title: "Off-ice work done!", line: "Strong off the ice, strong on it." });
    ctx.checkBadges();
  });
  return sheet.closed;
}
