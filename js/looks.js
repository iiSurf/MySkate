/* Skater colors: the color of your avatar on the friends board and on your card. Some are free and some unlock as you level up
   and earn badges. Colors that mean something in MySkate (gold for earned, blue for learning, coral for caution) are not on this
   list: these are only about who you are. Pure logic, no page code. */

import { BADGES } from "./badges.js";

/* from and to are the two ends of the avatar's gradient, and ink is the color of the letters on it. */
export const LOOKS = [
  { id: "sky", name: "Sky", from: "#9be9ff", to: "#3a8fd6", ink: "#05243f", unlock: { type: "free" } },
  { id: "rose", name: "Rose", from: "#ffc2da", to: "#e0457a", ink: "#3a0a1f", unlock: { type: "free" } },
  { id: "mint", name: "Mint", from: "#c4f7df", to: "#2fa37a", ink: "#052e1f", unlock: { type: "level", level: 2 } },
  { id: "violet", name: "Violet", from: "#dccfff", to: "#7a5cd6", ink: "#1d1040", unlock: { type: "level", level: 4 } },
  { id: "sunset", name: "Sunset", from: "#ffd9ae", to: "#e0603a", ink: "#3a1405", unlock: { type: "badge", badge: "sessions-5" } },
  { id: "midnight", name: "Midnight", from: "#5a68a0", to: "#141b3d", ink: "#f2f6ff", unlock: { type: "badge", badge: "skill-5" } },
];
export const LOOK_IDS = LOOKS.map((l) => l.id);
export const DEFAULT_LOOK = "sky";

export const lookById = (id) => LOOKS.find((l) => l.id === id) || LOOKS[0];

/* A saved look id, cleaned: a known id, or the default. */
export const sanitizeLookId = (v) => (typeof v === "string" && LOOK_IDS.includes(v) ? v : DEFAULT_LOOK);

/* A friend's look from their card: a known id, or "" when they sent none. */
export const sanitizeCardLook = (v) => (typeof v === "string" && LOOK_IDS.includes(v) ? v : "");

/* Is this look yours to use? have is { level, badgeIds }. */
export function isUnlocked(look, have) {
  const u = look.unlock;
  if (u.type === "free") return true;
  if (u.type === "level") return have.level >= u.level;
  return have.badgeIds.includes(u.badge);
}

/* What to do to unlock it, in words. */
export function unlockText(look) {
  const u = look.unlock;
  if (u.type === "free") return "Free";
  if (u.type === "level") return `Reach level ${u.level}`;
  const b = BADGES.find((x) => x.id === u.badge);
  return `Earn the ${b ? b.name : u.badge} badge`;
}

/* The look to actually use: your choice if it is unlocked, otherwise the default (so a restored backup or a changed file cannot
   put a locked color on your card). */
export function resolveLook(id, have) {
  const look = lookById(id);
  return isUnlocked(look, have) ? look : LOOKS[0];
}
