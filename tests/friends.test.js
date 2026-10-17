import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeFriend, makeCard, encodeCard, decodeCard, cardLink, parseFriendHash, parseFriendInput, upsertFriend, board } from "../js/friends.js";
import { defaultState, sanitizeState, parseBackup, exportJSON, mergeStates } from "../js/store.js";

const NOW = new Date("2026-10-17T18:00:00.000Z");
const card = (o = {}) => makeCard({ id: "abc-123", name: "Sam", level: 4, xpTotal: 640, xpWeek: 90, streak: 3, badges: 7, hours: 12.3, ...o }, NOW);

test("a card is cleaned: no control characters, a limited name, numbers kept in range", () => {
  const c = sanitizeFriend({ id: " x ", name: "  Sam\n\u0007  the  skater  with a very long name that goes on and on and on  ", level: 0, xpWeek: -5, xpTotal: 1e12, streak: 2.6, badges: "7", hours: 12.34, updatedAt: "not a date" });
  assert.equal(c.id, "x");
  assert.ok(c.name.length <= 40 && !/[\u0000-\u001f]/.test(c.name));
  assert.equal(c.name.startsWith("Sam the skater"), true, "runs of spaces become one");
  assert.deepEqual([c.level, c.xpWeek, c.xpTotal, c.streak, c.badges, c.hours], [1, 0, 1e7, 3, 0, 12.3]);
  assert.equal(c.updatedAt, new Date(0).toISOString());
  assert.equal(sanitizeFriend({ name: "no id" }), null);
  assert.equal(sanitizeFriend(null), null);
  assert.equal(sanitizeFriend({ id: "x", name: "   " }).name, "Friend");
  assert.equal(makeCard({ id: "x", name: "" }, NOW).name, "Skater", "your own card falls back to Skater");
});

test("a card goes into a short code and comes back the same", () => {
  const c = card();
  const code = encodeCard(c);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.ok(code.length < 300, `the code is ${code.length} characters`);
  assert.deepEqual(decodeCard(code), c);
  const unicode = card({ name: "Zoë 滑冰 ⛸️" });
  assert.deepEqual(decodeCard(encodeCard(unicode)), unicode);
});

test("anything that is not a card is refused", () => {
  const code = encodeCard(card());
  for (const bad of ["", null, undefined, 42, "short", "!!!!!!!!!!!!", "a".repeat(701), code.slice(0, -6), code + "###", "bm90IGEgY2FyZA", encodeCard(card()).replace(/./, "!")]) assert.equal(decodeCard(bad), null, String(bad).slice(0, 30));
  const wrongVersion = Buffer.from(JSON.stringify({ v: 2, i: "x", n: "A" })).toString("base64url");
  assert.equal(decodeCard(wrongVersion), null, "a card from a newer version is not guessed at");
  const noId = Buffer.from(JSON.stringify({ v: 1, n: "A" })).toString("base64url");
  assert.equal(decodeCard(noId), null);
  const evil = Buffer.from(JSON.stringify({ v: 1, i: "x", n: "<img src=x onerror=alert(1)>", l: "9".repeat(50), x: {}, w: [], s: null })).toString("base64url");
  const got = decodeCard(evil);
  assert.equal(got.name, "<img src=x onerror=alert(1)>", "kept as plain text; the screens escape it");
  assert.deepEqual([got.level, got.xpTotal, got.xpWeek, got.streak], [1, 0, 0, 0]);
});

test("the link keeps the card after the # and can be read from the address, or from whatever was pasted", () => {
  const c = card();
  const link = cardLink(c, "https://iisurf.github.io/MySkate/");
  assert.match(link, /^https:\/\/iisurf\.github\.io\/MySkate\/#\/friend\?c=[A-Za-z0-9_-]+$/);
  assert.equal(cardLink(c, "https://iisurf.github.io/MySkate/#/home"), link, "an old # is dropped");
  assert.deepEqual(parseFriendHash(link.slice(link.indexOf("#"))), c);
  assert.deepEqual(parseFriendHash(`#/friend?x=1&c=${encodeCard(c)}`), c);
  assert.equal(parseFriendHash("#/progress"), null);
  assert.equal(parseFriendHash("#/friend?c="), null);
  assert.deepEqual(parseFriendInput(`  ${link}  `), c, "the whole link");
  assert.deepEqual(parseFriendInput(encodeCard(c)), c, "just the code");
  assert.deepEqual(parseFriendInput(`Add me on MySkate: ${link}`), c, "a message with the link in it");
  assert.equal(parseFriendInput("hello"), null);
  assert.equal(parseFriendInput(""), null);
});

test("adding a friend: new ones are added, newer cards update, older cards and your own card are ignored", () => {
  const first = upsertFriend([], card(), "me");
  assert.equal(first.status, "added");
  const older = upsertFriend(first.friends, makeCard({ id: "abc-123", name: "Sam", level: 2, xpTotal: 100 }, new Date("2026-10-01T00:00:00Z")), "me");
  assert.equal(older.status, "older");
  assert.equal(older.friends[0].level, 4);
  const newer = upsertFriend(first.friends, makeCard({ id: "abc-123", name: "Sam B", level: 5, xpTotal: 900 }, new Date("2026-10-20T00:00:00Z")), "me");
  assert.deepEqual([newer.status, newer.friends.length, newer.friends[0].name, newer.friends[0].level], ["updated", 1, "Sam B", 5]);
  assert.equal(first.friends.length, 1, "the old list is not changed");
  assert.equal(upsertFriend([], card({ id: "me" }), "me").status, "self");
  assert.equal(upsertFriend([], { name: "x" }, "me").status, "invalid");
  const full = Array.from({ length: 100 }, (_, i) => card({ id: "f" + i }));
  assert.equal(upsertFriend(full, card({ id: "new" }), "me").status, "full");
  assert.equal(upsertFriend(full, makeCard({ id: "f1", name: "x" }, new Date("2030-01-01")), "me").status, "updated", "a full list can still update");
});

test("the board ranks you and your friends, best first, with ties sharing a place", () => {
  const me = card({ id: "me", name: "Me", xpWeek: 90, xpTotal: 640 });
  const friends = [card({ id: "a", name: "Ava", xpWeek: 120, xpTotal: 300 }), card({ id: "b", name: "Ben", xpWeek: 90, xpTotal: 800 }), card({ id: "c", name: "Cy", xpWeek: 10, xpTotal: 800 })];
  const week = board({ me, friends, period: "week" });
  assert.deepEqual(week.map((r) => [r.name, r.xp, r.rank, r.you]), [["Ava", 120, 1, false], ["Me", 90, 2, true], ["Ben", 90, 2, false], ["Cy", 10, 4, false]]);
  const all = board({ me, friends, period: "all" });
  assert.deepEqual(all.map((r) => [r.name, r.rank]), [["Ben", 1], ["Cy", 1], ["Me", 3], ["Ava", 4]]);
  assert.deepEqual(board({ me, friends: [], period: "week" }).map((r) => [r.name, r.rank, r.you]), [["Me", 1, true]]);
});

test("friends are saved with your data, cleaned, and a card id stays with you", () => {
  const state = defaultState();
  state.profile.cardId = "my-id";
  state.friends = [card({ id: "a", name: "Ava" })];
  const back = parseBackup(exportJSON(state)).state;
  assert.equal(back.profile.cardId, "my-id");
  assert.deepEqual(back.friends.map((f) => [f.id, f.name, f.badges, f.hours]), [["a", "Ava", 7, 12.3]]);
  const dirty = sanitizeState({ friends: [{ id: "a", name: "x".repeat(200), level: "high" }, { name: "no id" }, null, "junk"] });
  assert.equal(dirty.friends.length, 1);
  assert.equal(dirty.friends[0].name.length, 40);
  const old = JSON.parse(exportJSON(state));
  old.friends = [{ id: "old", name: "Old", level: 2, xpWeek: 5, xpTotal: 50, streak: 1, updatedAt: "2026-09-01T00:00:00Z" }];
  delete old.profile.cardId;
  const parsed = parseBackup(JSON.stringify(old)).state;
  assert.deepEqual([parsed.friends[0].badges, parsed.friends[0].hours, parsed.profile.cardId], [0, 0, ""], "a friend saved before badges and hours existed still loads");
  const mine = defaultState();
  mine.friends = [card({ id: "a", name: "Mine" })];
  const theirs = defaultState();
  theirs.friends = [card({ id: "a", name: "Theirs" }), card({ id: "b", name: "Bea" })];
  assert.deepEqual(mergeStates(mine, theirs).state.friends.map((f) => f.name), ["Mine", "Bea"]);
});
