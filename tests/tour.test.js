import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOUR_STEPS } from "../js/tour.js";
import { TOUR_DEMOS } from "../js/ui/tour.js";
import { XP, STREAK_MIN } from "../js/xp.js";
import { EARNED_AT } from "../js/stats.js";
import { SLOTS } from "../js/plan.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const everything = TOUR_STEPS.flatMap((s) => [s.title, s.lead, ...s.points.map((p) => `${p.b} ${p.t}`)]).join("\n");

test("every tour step has a unique id, words, and a picture that exists", () => {
  assert.ok(TOUR_STEPS.length >= 4);
  assert.equal(new Set(TOUR_STEPS.map((s) => s.id)).size, TOUR_STEPS.length);
  for (const s of TOUR_STEPS) {
    assert.ok(s.title && s.lead, `${s.id} needs a title and a lead`);
    assert.ok(TOUR_DEMOS.includes(s.demo), `${s.id} names a picture that is not drawn: ${s.demo}`);
    assert.ok(s.points.length >= 2 && s.points.every((p) => p.b && p.t), `${s.id} needs bold starts and texts`);
  }
});

test("the tour quotes the real numbers", () => {
  for (const n of [XP.session, XP.perMinute, XP.perSkill, XP.personalBest, STREAK_MIN, EARNED_AT, ...SLOTS]) {
    assert.ok(everything.includes(String(n)), `the tour should mention ${n}`);
  }
});

test("the buttons the tour talks about really have those labels", () => {
  const screens = ["home", "plan", "skate", "me"].map((n) => read(`js/screens/${n}.js`)).join("\n");
  for (const label of ["Start session", "End session", "Next skill", "+ Landed", "+ Missed", "Undo last try", "I just got them sharpened", "Save a backup", "Show me how MySkate works"]) {
    assert.ok(everything.includes(label), `the tour should mention "${label}"`);
    assert.ok(screens.includes(label), `no screen has a button labelled "${label}", but the tour tells people to tap it`);
  }
});

test("the tour is reachable from Me and Home, and opens by itself only once", () => {
  assert.match(read("js/screens/me.js"), /data-action="tour"/);
  assert.match(read("js/screens/home.js"), /data-action="tour"/);
  const app = read("js/app.js");
  assert.match(app, /showTour\(\{ firstTime: true \}\)/);
  assert.match(app, /if \(firstTime && ctx\.state\.profile\.tourSeen\) return/);
});
