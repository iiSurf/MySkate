/* The two sheets for locked backups: ask for a passphrase to lock one, and ask for it again to open one. */

import { html } from "../util.js";
import { openSheet, $ } from "./dom.js";
import { decryptBackup, isEncryptedBackup, MIN_PASSPHRASE } from "../crypto.js";

const show = (input, on) => (input.type = on ? "text" : "password");

/* A backup file's text, ready to read: as it is when it is not locked, or opened with the passphrase when it is. Resolves to
   the text, or to null if the skater gives up. */
export function readBackup(text) {
  if (!isEncryptedBackup(text)) return Promise.resolve(text);
  return new Promise((resolve) => {
    let opened = null;
    const sheet = openSheet(
      html`<h2 class="sheet__title sheet__title--small">This backup is locked</h2>
        <p class="note">Type the passphrase you used when you saved it. It is checked on this device and goes nowhere.</p>
        <label class="field"><span>Passphrase</span><input class="input" id="ul-pass" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false"></label>
        <div class="limit-row"><button class="chip" type="button" id="ul-show" aria-pressed="false">Show it</button></div>
        <p class="status status--warn" role="alert" hidden></p>
        <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="ul-go">Unlock</button></div>`,
      { label: "Unlock this backup", sticky: true }
    );
    const input = $("#ul-pass", sheet.dialog);
    const warn = $(".status--warn", sheet.dialog);
    const go = $("#ul-go", sheet.dialog);
    input.focus();
    $("#ul-show", sheet.dialog).addEventListener("click", (e) => {
      const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
      e.currentTarget.setAttribute("aria-pressed", String(on));
      e.currentTarget.textContent = on ? "Hide it" : "Show it";
      show(input, on);
    });
    const attempt = async () => {
      warn.hidden = true;
      go.disabled = true;
      go.textContent = "Unlocking…";
      const out = await decryptBackup(text, input.value);
      go.disabled = false;
      go.textContent = "Unlock";
      if (out.ok) {
        opened = out.text;
        sheet.close("ok");
        return;
      }
      warn.textContent = out.error === "wrong" ? "That passphrase does not open this backup, or the file was changed. Try again." : "This locked backup could not be read by this version of MySkate.";
      warn.hidden = false;
      input.select();
    };
    go.addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });
    sheet.closed.then(() => resolve(opened));
  });
}

/* Ask for a passphrase (twice) and lock a backup with it. lock(passphrase) does the work and may take a moment. */
export function openLockSheet(lock) {
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">Save a locked backup</h2>
      <p class="note">The backup is locked with your passphrase on this device, so anyone who gets the file needs the passphrase to read it. <strong>If you forget the passphrase, nobody can open the backup, and there is no reset.</strong></p>
      <label class="field"><span>Passphrase (at least ${MIN_PASSPHRASE} characters)</span><input class="input" id="lk-a" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false"></label>
      <label class="field"><span>Type it again</span><input class="input" id="lk-b" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false"></label>
      <div class="limit-row"><button class="chip" type="button" id="lk-show" aria-pressed="false">Show it</button></div>
      <p class="status status--warn" role="alert" hidden></p>
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">Cancel</button><button class="btn btn--small" type="button" id="lk-go">Lock and save</button></div>`,
    { label: "Save a locked backup", sticky: true }
  );
  const a = $("#lk-a", sheet.dialog);
  const b = $("#lk-b", sheet.dialog);
  const warn = $(".status--warn", sheet.dialog);
  const go = $("#lk-go", sheet.dialog);
  a.focus();
  $("#lk-show", sheet.dialog).addEventListener("click", (e) => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", String(on));
    e.currentTarget.textContent = on ? "Hide it" : "Show it";
    show(a, on);
    show(b, on);
  });
  const fail = (message) => {
    warn.textContent = message;
    warn.hidden = false;
  };
  go.addEventListener("click", async () => {
    warn.hidden = true;
    if (a.value.length < MIN_PASSPHRASE) return fail(`Use at least ${MIN_PASSPHRASE} characters. A few words in a row is easy to remember and hard to guess.`);
    if (a.value !== b.value) return fail("The two do not match. Type the same passphrase twice.");
    go.disabled = true;
    go.textContent = "Locking…";
    try {
      await lock(a.value);
      sheet.close("saved");
    } catch (err) {
      go.disabled = false;
      go.textContent = "Lock and save";
      fail("Could not lock the backup on this device. Try the normal backup instead.");
    }
  });
  return sheet.closed;
}
