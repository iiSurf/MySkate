/* DOM helpers: rendering safe markup, event delegation, toasts, and modal sheets. */

import { Raw, html } from "../util.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function render(el, content) {
  el.innerHTML = content instanceof Raw ? content.text : String(content);
}

/* Run handler(actionName, element, event) for clicks on anything with data-action inside root. */
export function delegate(root, type, handler) {
  root.addEventListener(type, (event) => {
    const el = event.target.closest("[data-action]");
    if (el && root.contains(el)) handler(el.dataset.action, el, event);
  });
}

/* Run handler(inputName, element, event) for input or change events on anything with data-input inside root. */
export function delegateInput(root, type, handler) {
  root.addEventListener(type, (event) => {
    const el = event.target.closest("[data-input]");
    if (el && root.contains(el)) handler(el.dataset.input, el, event);
  });
}

export function toast(message, ms = 3000) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* A modal sheet with Raw content. Anything with data-close="value" closes it with that value. */
export function openSheet(content, { label = "", dismissible = true } = {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "sheet";
  if (label) dialog.setAttribute("aria-label", label);
  dialog.innerHTML = `<div class="sheet__body">${content instanceof Raw ? content.text : content}</div>`;
  document.body.appendChild(dialog);
  let finish = () => {};
  const closed = new Promise((resolve) => {
    let settled = false;
    finish = (value) => {
      if (settled) return;
      settled = true;
      dialog.remove();
      resolve(value || "");
    };
  });
  /* The browser's own close event can arrive late or not at all in a background tab, so closing settles the promise directly. */
  const close = (value = "") => {
    if (dialog.open) dialog.close(value);
    finish(value);
  };
  dialog.addEventListener("close", () => finish(dialog.returnValue));
  dialog.addEventListener("cancel", (event) => {
    if (!dismissible) event.preventDefault();
    else setTimeout(() => finish(""), 0);
  });
  dialog.addEventListener("click", (event) => {
    const b = event.target.closest("[data-close]");
    if (b) close(b.dataset.close);
  });
  dialog.showModal();
  return { dialog, close, closed };
}

export async function confirmSheet({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "coral" }) {
  const confirmClass = tone === "coral" ? "btn btn--coral btn--small" : "btn btn--small";
  const sheet = openSheet(
    html`<h2 class="sheet__title sheet__title--small">${title}</h2>
      <p class="note">${message}</p>
      <div class="sheet__foot">
        <button class="btn btn--glass btn--small" data-close="cancel" type="button">${cancelLabel}</button>
        <button class="${confirmClass}" data-close="ok" type="button">${confirmLabel}</button>
      </div>`,
    { label: title }
  );
  return (await sheet.closed) === "ok";
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
