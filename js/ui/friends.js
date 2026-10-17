/* Friend sheets: look at a friend, and add (or refresh) one from a card. */

import { html, daysBetween, todayISO, fmtDate } from "../util.js";
import { openSheet, confirmSheet, toast, $ } from "./dom.js";
import { upsertFriend } from "../friends.js";

export const initials = (name) =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => [...w][0].toUpperCase())
    .join("") || "?";

/* How old a friend's numbers are: "today", "yesterday", "5 days ago". */
export function ageText(card) {
  const days = Math.max(0, daysBetween(todayISO(new Date(card.updatedAt)), todayISO()));
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

const stats = (c) => html`<div class="stats">
  <div><p class="num stat-n">${c.level}</p><p class="dim">level</p></div>
  <div><p class="num stat-n">${c.xpTotal}</p><p class="dim">XP in all</p></div>
  <div><p class="num stat-n">${c.xpWeek}</p><p class="dim">XP, last 7 days</p></div>
  <div><p class="num stat-n">${c.streak}</p><p class="dim">${c.streak === 1 ? "week" : "weeks"} in a row</p></div>
  <div><p class="num stat-n">${c.badges}</p><p class="dim">${c.badges === 1 ? "badge" : "badges"}</p></div>
  <div><p class="num stat-n">${c.hours}</p><p class="dim">hours on ice</p></div>
</div>`;

/* A friend's numbers, with a way to remove them. */
export function openFriend(ctx, id) {
  const f = ctx.state.friends.find((x) => x.id === id);
  if (!f) return;
  const stale = daysBetween(todayISO(new Date(f.updatedAt)), todayISO()) >= 7;
  const sheet = openSheet(
    html`<div class="friend-head"><span class="avatar" aria-hidden="true">${initials(f.name)}</span><div><h2 class="sheet__title sheet__title--small">${f.name}</h2><p class="dim">Card from ${ageText(f)} (${fmtDate(todayISO(new Date(f.updatedAt)), { month: "short", day: "numeric" })})</p></div></div>
      ${stats(f)}
      ${stale ? html`<p class="note">These numbers are a week or more old. Ask ${f.name} to send a fresh card, then open the link to update them.</p>` : ""}
      <div class="sheet__foot"><button class="chip chip--discard" type="button" id="friend-remove">Remove</button><button class="btn btn--small" type="button" data-close="done">Done</button></div>`,
    { label: f.name, sticky: true }
  );
  $("#friend-remove", sheet.dialog).addEventListener("click", async () => {
    const ok = await confirmSheet({ title: `Remove ${f.name}?`, message: "They disappear from your board. Opening their link again adds them back.", confirmLabel: "Remove" });
    if (!ok) return;
    ctx.state.friends = ctx.state.friends.filter((x) => x.id !== id);
    ctx.save();
    sheet.close("removed");
    ctx.update();
  });
  return sheet.closed;
}

/* A card someone sent: show who it is, then add (or refresh) them. Resolves when the sheet closes. */
export async function openAddFriend(ctx, card) {
  const myId = ctx.state.profile.cardId;
  const plan = upsertFriend(ctx.state.friends, card, myId);
  const message = {
    self: "That is your own card, so there is nothing to add.",
    older: `You already have a newer card from ${card.name}.`,
    full: "Your friends list is full (100). Remove someone first.",
    invalid: "That card could not be read.",
  }[plan.status];
  const sheet = openSheet(
    html`<div class="friend-head"><span class="avatar" aria-hidden="true">${initials(card.name)}</span><div><p class="eyebrow">${plan.status === "updated" ? "A fresh card from" : "A card from"}</p><h2 class="sheet__title sheet__title--small">${card.name}</h2></div></div>
      ${stats(card)}
      ${message ? html`<p class="note">${message}</p>` : html`<p class="note">${plan.status === "updated" ? "This replaces their older numbers." : "Their numbers are from when the card was made. Nothing else about them comes with it."}</p>`}
      <div class="sheet__foot"><button class="btn btn--glass btn--small" type="button" data-close="cancel">${message ? "Close" : "Not now"}</button>${message ? html`<span></span>` : html`<button class="btn btn--small" type="button" id="friend-add">${plan.status === "updated" ? "Update" : "Add"} ${card.name}</button>`}</div>`,
    { label: `Card from ${card.name}`, sticky: true }
  );
  const add = $("#friend-add", sheet.dialog);
  if (add) {
    add.addEventListener("click", () => {
      ctx.state.friends = plan.friends;
      ctx.save();
      sheet.close("added");
      ctx.update();
      toast(plan.status === "updated" ? `${card.name} updated.` : `${card.name} added to your friends.`);
    });
  }
  return sheet.closed;
}
