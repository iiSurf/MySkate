import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOUR_STEPS, TABS, tabTarget, stepIndex, firstApplicable, settle, isDone, practiceState } from "../js/tour.js";
import { defaultState } from "../js/store.js";
import { newActive, setEntry, recordTry } from "../js/timer.js";
import { XP, STREAK_MIN } from "../js/xp.js";
import { EARNED_AT } from "../js/stats.js";
import { SLOTS } from "../js/plan.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const everything = TOUR_STEPS.flatMap((s) => [s.title, s.text, s.next || "", s.alt ? s.alt.label : ""]).join("\n");
const ROUTES = ["home", "ice", "plan", "skate", "progress", "me", "compete"];
const at = (id) => stepIndex(id);

/* A pretend app to walk the tour through: a few skills, a state, and the rows Plan would show. */
const catalog = { skills: new Map([["s1", { cat: "skills" }], ["s2", { cat: "skills" }], ["j1", { cat: "jumps" }], ["sp1", { cat: "spins" }]]) };
const row = (checked, jump = false) => ({ getAttribute: () => String(checked), querySelector: (sel) => (jump && sel === ".cat--jumps" ? {} : null) });
function world({ rows = [row(false), row(false, true)], dialogSave = false } = {}) {
  const w = { state: { plan: { slotMin: 60, skillIds: [] }, active: null, sessions: [] }, route: "home", rows, dialogSave };
  w.view = () => ({
    state: w.state,
    catalog,
    route: w.route,
    find: () => null,
    all: (sel) => (sel === ".plan-grid .row--pick" ? w.rows : []),
    has: (sel) => (sel.includes('data-close="save"') ? w.dialogSave : false),
  });
  return w;
}

test("every step has a unique id, words, and a kind that makes sense", () => {
  assert.ok(TOUR_STEPS.length >= 10);
  assert.equal(new Set(TOUR_STEPS.map((s) => s.id)).size, TOUR_STEPS.length);
  for (const s of TOUR_STEPS) {
    assert.ok(s.title && s.text, `${s.id} needs a title and words`);
    assert.ok(s.kind === "info" || s.kind === "act", `${s.id} is info or act`);
    if (s.kind === "act") {
      assert.ok(typeof s.done === "function" || s.click === true, `${s.id} is something to do, so it needs a way to be finished`);
      assert.ok(s.target, `${s.id} is something to do, so it needs something to point at`);
    } else {
      assert.equal(s.done, undefined, `${s.id} is only to read, so the Next button finishes it`);
    }
    if (s.route) assert.ok(ROUTES.includes(s.route), `${s.id} names a screen that exists: ${s.route}`);
    if (s.alt) assert.ok(stepIndex(s.alt.goto) >= 0 && s.kind === "info", `${s.id} has a second button that goes to a step that exists`);
    if (s.inSheet) assert.equal(typeof s.target, "string", `${s.id} is in a sheet, so its target is a selector`);
    if (s.back) assert.ok(s.back.title && s.back.text && s.kind === "act", `${s.id} has words for when you are on the wrong screen`);
  }
  const last = TOUR_STEPS[TOUR_STEPS.length - 1];
  assert.equal(last.kind, "info");
  assert.equal(last.target, undefined, "the last step is a card in the middle");
});

test("the tour quotes the real numbers", () => {
  for (const n of [XP.session, XP.perMinute, XP.perSkill, XP.personalBest, STREAK_MIN, EARNED_AT, ...SLOTS]) {
    assert.ok(everything.includes(String(n)), `the tour should mention ${n}`);
  }
});

test("the buttons the tour talks about really have those labels", () => {
  const screens = ["home", "plan", "skate", "me", "ice", "progress", "compete"].map((n) => read(`js/screens/${n}.js`)).join("\n");
  for (const label of ["Start session", "End session", "Next skill", "+ Landed", "+ Missed", "Undo last try", "I just got them sharpened", "Save a backup", "Save session", "Show me how MySkate works", "Plan this", "My picks", "Badges", "Tests", "Friends", "Log off-ice work", "New competition", "New program", "Run it through", "Open"]) {
    assert.ok(everything.includes(label), `the tour should mention "${label}"`);
    assert.ok(screens.includes(label), `no screen has a button labelled "${label}", but the tour tells people to tap it`);
  }
});

test("everything the tour points at exists in the app", () => {
  const source = ["home", "plan", "skate", "me", "ice", "progress", "compete"].map((n) => read(`js/screens/${n}.js`)).join("\n") + read("js/ui/parts.js") + read("js/ui/eight.js");
  const nav = read("index.html");
  for (const s of TOUR_STEPS) {
    if (typeof s.target !== "string") continue;
    for (const m of s.target.matchAll(/data-action="([\w-]+)"/g)) assert.ok(new RegExp(`data-action="${m[1]}"|"${m[1]}"`).test(source), `${s.id} points at data-action="${m[1]}", which no screen has`);
    for (const m of s.target.matchAll(/data-close="([\w-]+)"/g)) assert.ok(source.includes(`data-close="${m[1]}"`), `${s.id} points at data-close="${m[1]}", which no sheet has`);
    for (const m of s.target.matchAll(/\.([a-z][\w-]*)/g)) assert.ok(source.includes(m[1]), `${s.id} points at .${m[1]}, which no screen draws`);
    for (const m of s.target.matchAll(/data-route="(\w+)"/g)) assert.ok(nav.includes(`data-route="${m[1]}"`), `${s.id} points at the ${m[1]} tab, which is not there`);
    for (const m of s.target.matchAll(/aria-labelledby="([\w-]+)"/g)) assert.ok(source.includes(`id="${m[1]}"`), `${s.id} points at a group labelled ${m[1]}, which is not there`);
  }
});

test("a tab for every screen, and competitions lights Plan", () => {
  for (const r of ROUTES) assert.ok(TABS[r], `${r} has a tab name`);
  assert.equal(tabTarget("compete"), tabTarget("plan"));
  assert.equal(TABS.compete, "Plan");
});

test("a step to read is never done by itself, a step to do is done by the state or by a tap", () => {
  const w = world();
  assert.equal(isDone(TOUR_STEPS[at("week")], w.view(), undefined, true), false);
  const slot = TOUR_STEPS[at("slot")];
  assert.equal(isDone(slot, w.view(), undefined, false), false);
  assert.equal(isDone(slot, w.view(), undefined, true), true, "tapping the slots is enough");
  const goPlan = TOUR_STEPS[at("go-plan")];
  assert.equal(isDone(goPlan, w.view()), false);
  w.route = "plan";
  assert.equal(isDone(goPlan, w.view()), true, "getting to Plan any way counts");
  const pick = TOUR_STEPS[at("pick")];
  assert.equal(isDone(pick, w.view()), false);
  w.state.plan.skillIds = ["s1"];
  assert.equal(isDone(pick, w.view()), true);
});

test("the jump step only comes up if there is a jump to add and none in the plan", () => {
  const jump = TOUR_STEPS[at("pick-jump")];
  const w = world();
  w.state.plan.skillIds = ["s1"];
  assert.equal(jump.when(w.view()), true);
  w.rows = [row(false), row(true, true)];
  assert.equal(jump.when(w.view()), false, "the only jump is already picked");
  w.rows = [row(false, false)];
  assert.equal(jump.when(w.view()), false, "no jump on the screen");
  w.rows = [row(false), row(false, true)];
  w.state.plan.skillIds = ["s1", "j1"];
  assert.equal(jump.when(w.view()), false, "a jump is in the plan already");
});

test("the jump counter steps only come up on a jump that has not been tried yet", () => {
  const landed = TOUR_STEPS[at("landed")];
  const w = world();
  w.state.active = newActive({ order: ["s1", "j1"], bookedMin: 60, now: 1000 });
  assert.equal(landed.when(w.view()), false, "the first skill is not a jump");
  w.state.active = { ...w.state.active, index: 1 };
  assert.equal(landed.when(w.view()), true);
  assert.equal(isDone(landed, w.view()), false);
  w.state.active = recordTry(w.state.active, "j1", true);
  assert.equal(landed.when(w.view()), false, "already tried");
  assert.equal(isDone(landed, w.view()), true);
  w.state.active = null;
  assert.equal(landed.when(w.view()), false, "no session, no counter");
});

test("Next skill is only asked for when there is a next skill, and is done when the skill changes", () => {
  const next = TOUR_STEPS[at("next")];
  const w = world();
  w.state.active = newActive({ order: ["s1"], bookedMin: 60, now: 1000 });
  assert.equal(next.when(w.view()), false, "one skill only");
  w.state.active = newActive({ order: ["s1", "j1"], bookedMin: 60, now: 1000 });
  assert.equal(next.when(w.view()), true);
  const snap = next.snap(w.view());
  assert.equal(isDone(next, w.view(), snap), false);
  w.state.active = { ...w.state.active, index: 1 };
  assert.equal(isDone(next, w.view(), snap), true);
});

test("rating is done by a star, whatever the skill", () => {
  const rate = TOUR_STEPS[at("rate")];
  const w = world();
  w.state.active = newActive({ order: ["s1"], bookedMin: 60, now: 1000 });
  assert.equal(isDone(rate, w.view()), false);
  w.state.active = setEntry(w.state.active, "s1", { stars: 3 });
  assert.equal(isDone(rate, w.view()), true);
});

test("if the session goes away mid-tour, the tour slips back to a step that still makes sense", () => {
  const w = world({ rows: [] });
  w.state.plan.skillIds = ["s1"];
  assert.equal(TOUR_STEPS[settle(TOUR_STEPS, at("rate"), w.view())].id, "start", "plan is still there: back to Start session");
  w.state.plan.skillIds = [];
  assert.equal(TOUR_STEPS[settle(TOUR_STEPS, at("rate"), w.view())].id, "pick", "no plan, and no jump on screen: back to picking a skill");
  w.state.active = newActive({ order: ["s1"], bookedMin: 60, now: 1000 });
  assert.equal(settle(TOUR_STEPS, at("rate"), w.view()), at("rate"), "a session is running: stay");
  w.dialogSave = false;
  assert.ok(settle(TOUR_STEPS, at("save"), w.view()) < at("save"), "the sheet was closed without saving: back to End session");
  w.dialogSave = true;
  assert.equal(settle(TOUR_STEPS, at("save"), w.view()), at("save"));
});

test("doing things another way moves the tour along, and never sends a skater who finished back to the start", () => {
  const w = world({ rows: [] });
  w.state.active = newActive({ order: ["s1"], bookedMin: 60, now: 1000 });
  assert.equal(settle(TOUR_STEPS, at("slot"), w.view()), at("clock"), "the session was started from somewhere else: the Plan steps are behind us");
  assert.equal(settle(TOUR_STEPS, at("rate"), w.view()), at("rate"));
  w.state.active = null;
  w.state.sessions = [{ id: "x" }];
  for (const id of ["welcome", "pick", "start", "rate", "end", "save"]) assert.equal(settle(TOUR_STEPS, at(id), w.view()), at("loop"), `a saved session finishes the first lap, even from ${id}`);
  assert.equal(settle(TOUR_STEPS, at("progress"), w.view()), at("progress"), "later steps stay where they are");
});

test("walking the whole first session: each step comes in order, and the steps that do not apply are skipped", () => {
  const w = world();
  const seen = [];
  let i = 0;
  const actions = {
    "go-plan": () => (w.route = "plan"),
    pick: () => (w.state.plan.skillIds = ["s1"]),
    "pick-jump": () => (w.state.plan.skillIds = ["s1", "j1"]),
    start: () => {
      w.state.active = newActive({ order: [...w.state.plan.skillIds], bookedMin: 60, now: 1000 });
      w.route = "skate";
    },
    rate: () => (w.state.active = setEntry(w.state.active, "s1", { stars: 4 })),
    next: () => (w.state.active = { ...w.state.active, index: 1 }),
    "landed-again": () => (w.state.active = recordTry(w.state.active, "j1", true)),
    end: () => (w.dialogSave = true),
    save: () => {
      w.state.sessions.push({ id: "x" });
      w.state.active = null;
      w.dialogSave = false;
      w.route = "home";
    },
    "go-progress": () => (w.route = "progress"),
    "go-ice": () => (w.route = "ice"),
    "go-compete": () => (w.route = "compete"),
    "go-me": () => (w.route = "me"),
  };
  let guard = 0;
  while (i < TOUR_STEPS.length && guard++ < 60) {
    const step = TOUR_STEPS[i];
    seen.push(step.id);
    if (step.kind === "act") {
      assert.equal(isDone(step, w.view(), step.snap && step.snap(w.view())), false, `${step.id} is not done before it is done`);
      const snap = step.snap && step.snap(w.view());
      if (step.click) assert.equal(isDone(step, w.view(), snap, true), true);
      else {
        assert.ok(actions[step.id], `the walk-through knows how to do ${step.id}`);
        actions[step.id]();
        assert.equal(isDone(step, w.view(), snap), true, `${step.id} is done after it is done`);
      }
    }
    i = firstApplicable(TOUR_STEPS, i + 1, w.view());
  }
  assert.deepEqual(seen, ["welcome", "week", "go-plan", "slot", "pick", "pick-jump", "start", "clock", "rate", "next", "landed-again", "end", "save", "loop", "go-progress", "progress", "go-ice", "ice", "go-compete", "compete", "blade", "go-me", "backup", "done"], "the first skill is not a jump, so the first counter step is skipped and the second one is used");
});

test("with no jump in the plan, the counter steps are skipped altogether", () => {
  const w = world({ rows: [row(false)] });
  w.state.plan.skillIds = ["s1", "s2"];
  w.state.active = newActive({ order: ["s1", "s2"], bookedMin: 60, now: 1000 });
  const ids = [];
  let i = at("clock");
  while (i < at("save")) {
    ids.push(TOUR_STEPS[i].id);
    i = firstApplicable(TOUR_STEPS, i + 1, w.view());
  }
  assert.deepEqual(ids, ["clock", "rate", "next", "end"]);
});

test("practice mode starts from a copy of who you are, with none of what you have done", () => {
  const real = defaultState();
  real.profile.name = "Sam";
  real.profile.levels = { skills: "lts-freeskate/free-skate-1", jumps: "lts-freeskate/free-skate-2" };
  real.profile.defaultSlotMin = 45;
  real.profile.tourSeen = false;
  real.settings = { light: "dusk", contrast: true };
  real.blades = { name: "Edea", limitHours: 30, baseHours: 4, countedFrom: "2026-01-01T00:00:00.000Z" };
  real.sessions = [{ id: "a" }];
  real.plan = { slotMin: 45, skillIds: ["s1"] };
  real.goals = [{ id: "g" }];
  real.friends = [{ id: "f" }];
  real.events = [{ id: "e" }];
  real.active = newActive({ order: ["s1"], bookedMin: 45 });
  const p = practiceState(real);
  assert.equal(p.profile.name, "Sam");
  assert.deepEqual(p.profile.levels, real.profile.levels);
  assert.equal(p.profile.defaultSlotMin, 45);
  assert.equal(p.profile.onboarded, true);
  assert.equal(p.profile.tourSeen, true);
  assert.deepEqual(p.settings, { light: "dusk", contrast: true });
  assert.equal(p.blades.limitHours, 30);
  assert.deepEqual([p.sessions, p.goals, p.friends, p.events, p.programs, p.rinks, p.homework, p.offIce], [[], [], [], [], [], [], [], []]);
  assert.deepEqual(p.plan, { slotMin: 45, skillIds: [] });
  assert.equal(p.active, null);
  // Nothing is shared: changing the copy leaves the real data alone.
  p.profile.levels.jumps = "x";
  p.settings.light = "sunrise";
  p.blades.limitHours = 1;
  p.sessions.push({ id: "b" });
  assert.equal(real.profile.levels.jumps, "lts-freeskate/free-skate-2");
  assert.equal(real.settings.light, "dusk");
  assert.equal(real.blades.limitHours, 30);
  assert.equal(real.sessions.length, 1);
  assert.equal(real.profile.tourSeen, false, "the real answer about the tour is not touched");
});

test("practice mode keeps nothing: saving, backups, and celebrations are held back while it runs", () => {
  const app = read("js/app.js");
  assert.match(app, /function save\(\) \{\s*[^}]*if \(ctx\.practice\) return;/);
  assert.match(app, /exportBackup\(\) \{\s*if \(ctx\.practice\)/);
  assert.match(app, /async exportBackupLocked\(passphrase\) \{\s*if \(ctx\.practice\)/);
  assert.match(app, /exportCSV\(\) \{\s*if \(ctx\.practice\)/);
  assert.match(app, /async checkBadges\(\{ silent = false \} = \{\}\) \{\s*if \(ctx\.practice\) return;/);
  assert.match(app, /levelUp: \(level\) => \(ctx\.practice \?/);
  assert.match(app, /endPractice\(\)/);
});

test("the tour is reachable from Me and Home, is offered once, and can be skipped", () => {
  assert.match(read("js/screens/me.js"), /data-action="tour"/);
  assert.match(read("js/screens/home.js"), /data-action="tour"/);
  const app = read("js/app.js");
  assert.match(app, /showTour\(\{ firstTime: true \}\)/);
  assert.match(app, /if \(firstTime && ctx\.state\.profile\.tourSeen\) return/);
  const coach = read("js/ui/coach.js");
  assert.match(coach, /Skip for now/);
  assert.match(coach, /data-coach="skip"/);
  assert.match(coach, /Skip tour/);
});
