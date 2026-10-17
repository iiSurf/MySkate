/* Me: your name and level, how MySkate looks, and keeping your data safe with backups. */

import { html, fmtDate, todayISO } from "../util.js";
import { $, openSheet, confirmSheet, toast } from "../ui/dom.js";
import { levelOptions } from "../ui/onboard.js";
import { parseBackup, mergeStates, replaceState, defaultState, requestPersistence } from "../store.js";
import { SLOTS } from "../plan.js";
import { sanitizeCost } from "../cost.js";
import { readBackup, openLockSheet } from "../ui/unlock.js";
import { LOOKS, isUnlocked, unlockText } from "../looks.js";
import { avatar } from "../ui/friends.js";

const LIGHT_NAMES = { sunrise: "Sunrise", golden: "Golden hour", midday: "Midday", dusk: "Dusk" };

export function renderMe(ctx) {
  const { state, catalog } = ctx;
  const last = state.backup.lastExportAt;
  const lastText = last ? `Last backup: ${fmtDate(todayISO(new Date(last)), { weekday: "long", month: "long", day: "numeric" })}.` : "You have not saved a backup yet.";
  const safe = (url) => (typeof url === "string" && /^https:\/\//.test(url) ? url : "");
  const have = ctx.lookHave();
  return html`
    <header class="screen-head"><div><p class="eyebrow">Your setup</p><h1>Me</h1></div></header>
    <section class="card card--ice help-card" aria-labelledby="help-title">
      <div class="grow"><h2 id="help-title">Help</h2><p class="dim">New here, or forgot how something works? The quick tour covers planning, skating, XP, blade life, and backups.</p></div>
      <button class="btn" type="button" data-action="tour">Show me how MySkate works</button>
    </section>
    <div class="grid-2">
      <section class="card stack">
        <h2>Skater</h2>
        <label class="field"><span>Your name</span><input class="input" type="text" maxlength="40" value="${state.profile.name}" data-input="name" autocomplete="given-name" placeholder="Your first name"></label>
        <label class="field"><span>Skating skills level</span><select class="input" data-input="level-skills">${levelOptions(catalog, "skills", state.profile.levels.skills)}</select></label>
        <label class="field"><span>Jumps and spins level</span><select class="input" data-input="level-jumps">${levelOptions(catalog, "jumps", state.profile.levels.jumps)}</select></label>
        <div class="field">
          <span id="slot-label">Usual ice slot, in minutes</span>
          <div class="limit-row" role="group" aria-labelledby="slot-label">${SLOTS.map((m) => html`<button class="chip" type="button" data-action="default-slot" data-min="${m}" aria-pressed="${state.profile.defaultSlotMin === m}">${m}</button>`)}</div>
        </div>
        <label class="field"><span>Usual cost per session (optional)</span><input class="input input--num" type="number" inputmode="decimal" min="0" max="999" step="0.5" value="${state.profile.defaultCost ?? ""}" data-input="default-cost" placeholder="18"></label>
        <p class="note">When you save a session it starts with this cost, and you can change it for any one session. Blade settings are on Home, in the Blade life tile.</p>
      </section>

      <section class="card stack">
        <h2>Your color</h2>
        <p class="dim">The color of your avatar on the friends board and on the card you send. Some colors unlock as you level up and earn badges.</p>
        <div class="swatches" role="group" aria-label="Your color">${LOOKS.map((l) => {
          const open = isUnlocked(l, have);
          return html`<button class="swatch ${open ? "" : "is-locked"}" type="button" data-action="look" data-id="${l.id}" aria-pressed="${state.profile.look === l.id && open}" aria-label="${l.name}${open ? "" : ", locked. " + unlockText(l)}">${avatar(state.profile.name.trim() || "Me", l.id)}<span class="swatch__name">${l.name}</span>${open ? "" : html`<span class="swatch__lock">${unlockText(l)}</span>`}</button>`;
        })}</div>
      </section>

      <section class="card stack">
        <h2>Look</h2>
        <div class="field">
          <span id="light-label">Light of day</span>
          <div class="limit-row" role="group" aria-labelledby="light-label">${Object.entries(LIGHT_NAMES).map(([key, label]) => html`<button class="chip" type="button" data-action="light" data-light="${key}" aria-pressed="${state.settings.light === key}">${label}</button>`)}</div>
        </div>
        <div class="field">
          <span id="contrast-label">Text</span>
          <div class="limit-row" role="group" aria-labelledby="contrast-label"><button class="chip" type="button" data-action="contrast" aria-pressed="${state.settings.contrast}">High contrast</button></div>
        </div>
        <p class="note">High contrast makes surfaces solid, text white, and the ice calmer. It also switches on by itself when your device asks for more contrast.</p>
      </section>

      <section class="card card--ice stack">
        <h2>Backup and restore</h2>
        <p class="dim">Your progress lives in this browser. Save a backup file now and then, so it is safe if the browser clears its data and so you can move to a new phone or computer.</p>
        <p class="status" id="backup-status">${lastText}</p>
        <div class="cluster">
          <button class="btn" type="button" data-action="export">Save a backup</button>
          <button class="btn btn--glass" type="button" data-action="export-csv">Spreadsheet (CSV)</button>
        </div>
        <div class="cluster"><button class="btn btn--glass btn--small" type="button" data-action="export-locked">Save a locked backup (passphrase)</button></div>
        <p class="note">A locked backup needs your passphrase to open, so it is safer to keep in email or cloud storage. Nobody can open it if you forget the passphrase.</p>
        <label class="choice" for="restore-file"><strong>Restore from a backup file</strong><span class="note">Pick a MySkate backup (JSON). You choose whether to merge it or replace what is here. Nothing is uploaded.</span></label>
        <input id="restore-file" type="file" accept=".json,application/json" data-input="restore-file" hidden>
        <div class="cluster"><button class="chip" type="button" data-action="persist">Ask the browser to keep my data</button><span class="dim" id="persist-status"></span></div>
        <p class="note">To use MySkate on a second device, save a backup here, move the file (AirDrop, email, or cloud storage), and restore it there.</p>
      </section>

      <section class="card stack">
        <h2>About</h2>
        <p class="dim">MySkate keeps a practice log, ice time, blade life, and progress on your own device. No accounts and no tracking.</p>
        <p class="eyebrow">Where the skill lists come from</p>
        <ul class="sources">${catalog.tracks.map((t) => html`<li><strong>${t.name}</strong><br><span class="dim">${safe(t.source && t.source.url) ? html`<a href="${safe(t.source.url)}" target="_blank" rel="noopener">${t.source.label}</a>` : t.source ? t.source.label : ""}</span></li>`)}</ul>
        <p class="note">Skill lists are summarized from public curricula and may differ from your coach or club. Always follow your coach.</p>
        <button class="chip chip--discard" type="button" data-action="wipe">Delete all my data</button>
      </section>
    </div>`;
}

export function mountMe() {
  const el = $("#persist-status");
  if (el && navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then((p) => {
      const node = $("#persist-status");
      if (node) node.textContent = p ? "The browser has agreed to keep it." : "Not guaranteed by the browser.";
    });
  }
  return () => {};
}

async function restoreFile(ctx, file) {
  const text = await readBackup(await file.text());
  if (text === null) return;
  const result = parseBackup(text);
  if (!result.ok) {
    toast(result.error, 5000);
    return;
  }
  const { sessions, first, last } = result.summary;
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">Restore this backup?</h2>
      <p class="note">The file has ${sessions} ${sessions === 1 ? "session" : "sessions"}${first ? `, from ${first} to ${last}` : ""}. This device has ${ctx.state.sessions.length}.</p>
      <div class="choices">
        <button class="choice choice--primary" type="button" data-close="merge"><strong>Merge with what I have</strong><span class="note">Adds the sessions you are missing. Nothing here is lost and nothing is doubled.</span></button>
        <button class="choice" type="button" data-close="replace"><strong>Replace everything</strong><span class="note">Swaps what is on this device for the backup.</span></button>
      </div>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button></div>`,
    { label: "Restore this backup" }
  );
  const choice = await sheet.closed;
  if (choice === "merge") {
    const { state, addedSessions } = mergeStates(ctx.state, result.state);
    state.active = ctx.state.active;
    state.backup = ctx.state.backup;
    ctx.setState(state);
    ctx.save();
    toast(addedSessions ? `Merged. ${addedSessions} ${addedSessions === 1 ? "session" : "sessions"} added.` : "Merged. You already had everything in that file.");
  } else if (choice === "replace") {
    const ok = await confirmSheet({ title: "Replace everything?", message: "What is on this device now will be swapped for the backup. Save a backup first if you want to keep it.", confirmLabel: "Replace" });
    if (!ok) return;
    const next = replaceState(result.state, ctx.state);
    next.active = ctx.state.active;
    ctx.setState(next);
    ctx.save();
    toast("Restored from the backup.");
  } else {
    return;
  }
  ctx.syncIce({});
  ctx.applySettings();
  ctx.update();
  ctx.checkBadges({ silent: true });
}

export function meActions(ctx) {
  return {
    "default-slot": (el) => {
      ctx.state.profile.defaultSlotMin = Number(el.dataset.min);
      if (!ctx.state.plan.skillIds.length) ctx.state.plan.slotMin = ctx.state.profile.defaultSlotMin;
      ctx.save();
      ctx.update();
    },
    light: (el) => {
      ctx.state.settings.light = el.dataset.light;
      ctx.save();
      ctx.applySettings();
      ctx.update();
    },
    contrast: () => {
      ctx.state.settings.contrast = !ctx.state.settings.contrast;
      ctx.save();
      ctx.applySettings();
      ctx.update();
    },
    tour: () => ctx.showTour(),
    look: (el) => {
      const look = LOOKS.find((l) => l.id === el.dataset.id);
      if (!look) return;
      if (!isUnlocked(look, ctx.lookHave())) return toast(`${unlockText(look)} to unlock ${look.name}.`, 4000);
      ctx.state.profile.look = look.id;
      ctx.save();
      ctx.update();
    },
    export: () => ctx.exportBackup(),
    "export-locked": () => openLockSheet((passphrase) => ctx.exportBackupLocked(passphrase)),
    "export-csv": () => ctx.exportCSV(),
    persist: async () => {
      const ok = await requestPersistence();
      toast(ok ? "Your browser will try hard to keep your data." : "The browser did not agree. Backups are the safe way.", 4500);
      const node = $("#persist-status");
      if (node) node.textContent = ok ? "The browser has agreed to keep it." : "Not guaranteed by the browser.";
    },
    wipe: async () => {
      const ok = await confirmSheet({ title: "Delete all your data?", message: "Every session, rating, and setting on this device is removed. A backup file is the only way back, so save one first.", confirmLabel: "Delete everything" });
      if (!ok) return;
      ctx.setState(defaultState());
      ctx.save();
      ctx.syncIce({});
      ctx.applySettings();
      ctx.go("home");
      ctx.startOnboarding();
    },
  };
}

export function meInputs(ctx) {
  return {
    name: (el) => {
      ctx.state.profile.name = el.value.trim().slice(0, 40);
      ctx.save();
    },
    "default-cost": (el) => {
      ctx.state.profile.defaultCost = sanitizeCost(el.value);
      ctx.save();
    },
    "level-skills": (el) => {
      ctx.state.profile.levels.skills = el.value;
      ctx.save();
    },
    "level-jumps": (el) => {
      ctx.state.profile.levels.jumps = el.value;
      ctx.save();
    },
    "restore-file": async (el) => {
      const file = el.files[0];
      el.value = "";
      if (file) await restoreFile(ctx, file);
    },
  };
}

