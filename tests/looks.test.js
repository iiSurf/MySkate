import test from "node:test";
import assert from "node:assert/strict";
import { LOOKS, LOOK_IDS, DEFAULT_LOOK, lookById, sanitizeLookId, sanitizeCardLook, isUnlocked, unlockText, resolveLook } from "../js/looks.js";
import { BADGES } from "../js/badges.js";

const none = { level: 1, badgeIds: [] };

test("the colors are well formed, with the free ones first and readable letters on each", () => {
  assert.ok(LOOKS.length >= 6);
  assert.equal(new Set(LOOK_IDS).size, LOOKS.length);
  assert.equal(LOOKS[0].id, DEFAULT_LOOK);
  assert.ok(LOOKS.filter((l) => l.unlock.type === "free").length >= 2, "at least two colors are free");
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const l of LOOKS) {
    assert.match(l.from + l.to + l.ink, /^(#[0-9a-f]{6}){3}$/i, l.id);
    assert.ok(contrast(l.ink, l.from) >= 4.5, `${l.id}: letters on the light end`);
    assert.ok(contrast(l.ink, l.to) >= 3, `${l.id}: letters on the dark end (large letters)`);
  }
});

test("every unlock condition names a real badge or a level you can reach", () => {
  const badgeIds = BADGES.map((b) => b.id);
  for (const l of LOOKS) {
    if (l.unlock.type === "badge") assert.ok(badgeIds.includes(l.unlock.badge), `${l.id} needs a badge that exists`);
    if (l.unlock.type === "level") assert.ok(l.unlock.level >= 2 && l.unlock.level <= 10, l.id);
    assert.ok(["free", "level", "badge"].includes(l.unlock.type));
  }
});

test("a color is yours when it is free, or you have the level or the badge", () => {
  const mint = lookById("mint");
  const sunset = lookById("sunset");
  assert.equal(isUnlocked(lookById("sky"), none), true);
  assert.equal(isUnlocked(mint, none), false);
  assert.equal(isUnlocked(mint, { level: 2, badgeIds: [] }), true);
  assert.equal(isUnlocked(mint, { level: 9, badgeIds: [] }), true);
  assert.equal(isUnlocked(sunset, { level: 9, badgeIds: [] }), false, "a level does not open a badge color");
  assert.equal(isUnlocked(sunset, { level: 1, badgeIds: ["sessions-5"] }), true);
});

test("the words for what unlocks a color", () => {
  assert.equal(unlockText(lookById("sky")), "Free");
  assert.equal(unlockText(lookById("violet")), "Reach level 4");
  assert.equal(unlockText(lookById("sunset")), "Earn the Getting regular badge");
  assert.equal(unlockText(lookById("midnight")), "Earn the Skill collector badge");
});

test("saved looks and a friend's look are cleaned", () => {
  assert.equal(sanitizeLookId("rose"), "rose");
  for (const bad of ["", "neon", null, undefined, 3, {}, ["rose"]]) assert.equal(sanitizeLookId(bad), DEFAULT_LOOK, String(bad));
  assert.equal(sanitizeCardLook("mint"), "mint");
  for (const bad of ["", "neon", null, undefined, 3]) assert.equal(sanitizeCardLook(bad), "", String(bad));
  assert.equal(lookById("neon").id, DEFAULT_LOOK);
});

test("a color you have not unlocked falls back to the default, so a file cannot put one on your card", () => {
  assert.equal(resolveLook("violet", none).id, "sky");
  assert.equal(resolveLook("violet", { level: 4, badgeIds: [] }).id, "violet");
  assert.equal(resolveLook("rose", none).id, "rose");
  assert.equal(resolveLook("nonsense", none).id, "sky");
});
