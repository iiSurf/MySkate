/* Friend cards: a small snapshot of a skater (name, level, XP, streak, badges, hours on the ice) that travels as a link, and the
   board that ranks you and your friends. There is no server, so a friend's numbers are as of the day their card was made, and
   the board says so. A card holds no sessions, notes, or anything else, and the link keeps the card after the # so it is never
   sent to any website. Pure logic, no page code. */

export const CARD_VERSION = 1;
export const MAX_FRIENDS = 100;
const MAX_CODE = 700;

const clamp = (v, lo, hi, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const cleanName = (v, fallback) => {
  const t = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40) : "";
  return t || fallback;
};
const stamp = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/* A friend (or a card), cleaned. Returns null when it has no id. */
export function sanitizeFriend(f) {
  if (!f || typeof f !== "object") return null;
  const id = typeof f.id === "string" ? f.id.trim().slice(0, 80) : "";
  if (!id) return null;
  return {
    id,
    name: cleanName(f.name, "Friend"),
    level: Math.round(clamp(f.level, 1, 999, 1)),
    xpWeek: Math.round(clamp(f.xpWeek, 0, 1e6)),
    xpTotal: Math.round(clamp(f.xpTotal, 0, 1e7)),
    streak: Math.round(clamp(f.streak, 0, 999)),
    badges: Math.round(clamp(f.badges, 0, 999)),
    hours: Math.round(clamp(f.hours, 0, 99999) * 10) / 10,
    updatedAt: stamp(f.updatedAt) || new Date(0).toISOString(),
  };
}

/* The card for you, as of now. */
export function makeCard({ id, name, level, xpTotal, xpWeek, streak, badges, hours }, now = new Date()) {
  return sanitizeFriend({ id, name: name || "Skater", level, xpTotal, xpWeek, streak, badges, hours, updatedAt: now.toISOString() });
}

const toB64 = (text) => {
  let bin = "";
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (code) => {
  const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/* The card as a short text made of letters, digits, - and _. */
export function encodeCard(card) {
  const c = sanitizeFriend(card);
  return toB64(JSON.stringify({ v: CARD_VERSION, i: c.id, n: c.name, l: c.level, x: c.xpTotal, w: c.xpWeek, s: c.streak, b: c.badges, h: c.hours, t: c.updatedAt }));
}

/* A card back from its text, or null if it is not a card (too long, not readable, from a newer version, or missing its id). */
export function decodeCard(code) {
  if (typeof code !== "string" || code.length < 8 || code.length > MAX_CODE || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const d = JSON.parse(fromB64(code));
    if (!d || typeof d !== "object" || d.v !== CARD_VERSION) return null;
    return sanitizeFriend({ id: d.i, name: d.n, level: d.l, xpTotal: d.x, xpWeek: d.w, streak: d.s, badges: d.b, hours: d.h, updatedAt: d.t });
  } catch (err) {
    return null;
  }
}

/* The link a friend opens to add you: base is this app's address (like https://iisurf.github.io/MySkate/). */
export const cardLink = (card, base) => `${String(base).split("#")[0]}#/friend?c=${encodeCard(card)}`;

/* A card from the part of a page address after #, or null. */
export function parseFriendHash(hash) {
  const m = /^#\/friend\?(.*)$/.exec(String(hash || ""));
  if (!m) return null;
  return decodeCard(new URLSearchParams(m[1]).get("c") || "");
}

/* A card from whatever a friend sent: the whole link, or just the code at the end of it. */
export function parseFriendInput(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const i = t.indexOf("#/friend?");
  return i >= 0 ? parseFriendHash(t.slice(i)) : decodeCard(t);
}

/* Add or refresh a friend. status: "added", "updated", "older" (you already have a newer card from them), "self" (it is your own
   card), or "full". Returns a new list and leaves the old one alone. */
export function upsertFriend(friends, card, myId) {
  const c = sanitizeFriend(card);
  if (!c) return { friends, status: "invalid" };
  if (myId && c.id === myId) return { friends, status: "self" };
  const at = friends.findIndex((f) => f.id === c.id);
  if (at >= 0) {
    if (c.updatedAt <= friends[at].updatedAt) return { friends, status: "older" };
    const next = [...friends];
    next[at] = c;
    return { friends: next, status: "updated" };
  }
  if (friends.length >= MAX_FRIENDS) return { friends, status: "full" };
  return { friends: [...friends, c], status: "added" };
}

/* You and your friends, best first. period is "week" (the last 7 days) or "all". Equal scores share a place.
   me is your own card; its numbers are live, the friends' are as of their cards. */
export function board({ me, friends, period }) {
  const score = (f) => (period === "week" ? f.xpWeek : f.xpTotal);
  const rows = [{ ...me, you: true }, ...friends.map((f) => ({ ...f, you: false }))].sort((a, b) => score(b) - score(a) || Number(b.you) - Number(a.you) || a.name.localeCompare(b.name));
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || score(r) !== score(rows[i - 1])) rank = i + 1;
    return { ...r, xp: score(r), rank };
  });
}
