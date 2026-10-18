/* The guided tour: what each step says, where it points, and what the skater has to do to move on. This file is pure (no page,
   no storage), so every rule can be tested. ui/coach.js draws it. The numbers come from the same constants the app uses, so the
   tour never drifts from how XP, streaks, and earned skills really work.

   The tour runs in practice mode: it works on a made-up copy of your data (practiceState), so nothing you do while learning is
   saved, and your own sessions, plan, and progress stay exactly as they were.

   A step is one of:
     info  a thing to look at. It has a Next button.
     act   a thing to do. It moves on by itself when it is done: when the target is tapped (click: true), or when done(view, snap)
           says so, which looks at the real state, so it still works if the skater did it another way.

   Each step has:
     id        a short unique name
     route     the screen it lives on. An info step takes you there; an act step whose target is missing sends you back to its tab.
     target    where to point: a selector, or a function (view) giving a selector or an element. None means a centered card.
     title     the headline
     text      what to do, and what it does
     when      (view) false means skip this step (for example, no jump in the plan yet)
     requires  (view) false means the tour has slipped back (the session was discarded, the plan emptied): go back to an earlier step
     snap      (view) something to remember when the step starts, handed back to done
     inSheet   the target is inside a sheet, so the card is drawn inside the sheet
     next      the label for the Next button (info steps)
     alt       { label, goto } a second button that jumps to the step with that id
     back      { title, text } what to say, instead of "Back to Plan", when the target is not on this screen
     back      { title, text } what to say, instead of "Back to Plan", when the target is not on this screen

   The view a step looks at: { state, catalog, route, find(selector), all(selector), has(selector) }. */

import { XP, STREAK_MIN } from "./xp.js";
import { EARNED_AT } from "./stats.js";
import { SLOTS } from "./plan.js";
import { entryOf } from "./timer.js";
import { defaultState } from "./store.js";

/* The label of each tab, for "head back to Plan". Competitions has no tab of its own: Plan stays lit while you are in it. */
export const TABS = { home: "Home", ice: "Ice", plan: "Plan", skate: "Skate", progress: "Progress", me: "Profile", compete: "Plan" };

export const tabTarget = (route) => `#nav [data-route="${route === "compete" ? "plan" : route}"]`;

const planIds = (v) => v.state.plan.skillIds;
const isJump = (v, id) => (v.catalog.skills.get(id) || {}).cat === "jumps";
const planHasJump = (v) => planIds(v).some((id) => isJump(v, id));
const current = (v) => {
  const a = v.state.active;
  if (!a) return null;
  const id = a.order[a.index];
  return { id, entry: entryOf(a, id), jump: isJump(v, id) };
};
const onJumpNoTries = (v) => {
  const c = current(v);
  return Boolean(c && c.jump && c.entry.attempts === 0);
};

/* The rows of skills on Plan that are not in the plan yet. */
const openRows = (v) => v.all(".plan-grid .row--pick").filter((r) => r.getAttribute("aria-checked") === "false");
const firstRow = (v) => openRows(v)[0] || null;
const jumpRow = (v) => openRows(v).find((r) => r.querySelector(".cat--jumps")) || null;

const SAVE = 'dialog[open] [data-close="save"]';

export const TOUR_STEPS = [
  {
    id: "welcome",
    kind: "info",
    route: "home",
    title: "Welcome to practice",
    text: "Follow the sparkles and tap where they point. This is a practice run, so nothing you do here is saved.",
    next: "Let's go",
  },
  {
    id: "week",
    kind: "info",
    route: "home",
    target: ".home__eight .eight",
    title: "Your week, as a figure eight",
    text: `Every session you save traces one loop. Skate ${STREAK_MIN} or more times in a week to close the eight and keep your streak.`,
  },
  {
    id: "go-plan",
    kind: "act",
    target: tabTarget("plan"),
    title: "Plan first",
    text: "Tap Plan. This is where you choose what to work on before you step on the ice.",
    done: (v) => v.route === "plan",
  },
  {
    id: "slot",
    kind: "act",
    route: "plan",
    target: '[role="group"][aria-labelledby="slot-title"]',
    title: "How long is your ice time?",
    text: `Tap your ice slot in minutes: ${SLOTS.slice(0, -1).join(", ")}, or ${SLOTS[SLOTS.length - 1]}. Booked something else? Type your own.`,
    click: true,
  },
  {
    id: "pick",
    kind: "act",
    route: "plan",
    target: firstRow,
    title: "Pick a skill",
    text: "Tap a skill to add it to your plan. MySkate suggests what to try next from your level and what still needs work.",
    done: (v) => planIds(v).length >= 1,
  },
  {
    id: "pick-jump",
    kind: "act",
    route: "plan",
    target: jumpRow,
    title: "Add a jump too",
    text: "Tap a jump. Jumps get a counter on the ice, so you can track every try. Your slot is shared evenly between the skills.",
    when: (v) => !planHasJump(v) && Boolean(jumpRow(v)),
    done: planHasJump,
  },
  {
    id: "start",
    kind: "act",
    route: "plan",
    target: '.plan-summary [data-action="start"]',
    title: "Take the ice",
    text: "Tap Start session. Your plan becomes a session with a clock.",
    requires: (v) => planIds(v).length > 0 || Boolean(v.state.active),
    done: (v) => Boolean(v.state.active),
  },
  {
    id: "clock",
    kind: "info",
    route: "skate",
    target: ".timer-card",
    title: "The clock is yours",
    text: "It counts only your time on ice. Tap pause when you rest. Your progress saves as you go.",
    requires: (v) => Boolean(v.state.active),
  },
  {
    id: "rate",
    kind: "act",
    route: "skate",
    target: ".rating",
    title: "Rate each skill",
    text: `Tap the stars to say how it went, one to five. ${EARNED_AT} stars or more earns the skill. Be honest: it is your notebook.`,
    requires: (v) => Boolean(v.state.active),
    done: (v) => {
      const c = current(v);
      return Boolean(c && c.entry.stars > 0);
    },
  },
  {
    id: "landed",
    kind: "act",
    route: "skate",
    target: '[data-action="landed"]',
    title: "Count your tries",
    text: "This one is a jump. Tap + Landed each time you stick it and + Missed each time you do not. Slipped? Tap Undo last try.",
    requires: (v) => Boolean(v.state.active),
    when: onJumpNoTries,
    done: (v) => {
      const c = current(v);
      return Boolean(c && c.entry.attempts > 0);
    },
  },
  {
    id: "next",
    kind: "act",
    route: "skate",
    target: '[data-action="next"]',
    title: "On to the next skill",
    text: "Tap Next skill. You can add a note on any skill about what felt good or what to fix.",
    requires: (v) => Boolean(v.state.active),
    when: (v) => Boolean(v.state.active) && v.state.active.index < v.state.active.order.length - 1,
    snap: (v) => (v.state.active ? v.state.active.index : 0),
    done: (v, snap) => Boolean(v.state.active) && v.state.active.index !== snap,
  },
  {
    id: "landed-again",
    kind: "act",
    route: "skate",
    target: '[data-action="landed"]',
    title: "Another jump",
    text: "Tap + Landed or + Missed for each try, just like before.",
    requires: (v) => Boolean(v.state.active),
    when: onJumpNoTries,
    done: (v) => {
      const c = current(v);
      return Boolean(c && c.entry.attempts > 0);
    },
  },
  {
    id: "end",
    kind: "act",
    route: "skate",
    target: '[data-action="end"]',
    title: "Step off the ice",
    text: "All done? Tap End session.",
    requires: (v) => Boolean(v.state.active),
    done: (v) => v.has(SAVE),
  },
  {
    id: "save",
    kind: "act",
    inSheet: true,
    target: SAVE,
    title: "Save it",
    text: `First you see what you earned: ${XP.session} XP for a session, ${XP.perMinute} per minute on ice, ${XP.perSkill} for each skill you practice, and ${XP.personalBest} for a new personal best. Tap Save session.`,
    requires: (v) => v.has(SAVE),
    done: (v) => v.state.sessions.length >= 1,
  },
  {
    id: "loop",
    kind: "info",
    route: "home",
    target: ".home__eight .eight",
    title: "There is your first loop",
    text: "That session traced one loop of your eight. Your level and streak grow the same way: just keep showing up.",
    requires: (v) => v.state.sessions.length >= 1,
    next: "Show me more",
    alt: { label: "Finish the tour", goto: "done" },
  },
  {
    id: "go-progress",
    kind: "act",
    target: tabTarget("progress"),
    title: "See how far you have come",
    text: "Tap Progress.",
    done: (v) => v.route === "progress",
  },
  {
    id: "progress",
    kind: "info",
    route: "progress",
    target: ".screen-head",
    title: "Everything you have done",
    text: "Hours by week, what the ice costs, a practice calendar, and every skill and session. The Tests tab tracks a test, the Friends tab is a board of you and your friends, and the Badges tab is your trophy case. Tap Log off-ice work on the Sessions tab for your workouts.",
  },
  {
    id: "go-ice",
    kind: "act",
    target: tabTarget("ice"),
    title: "Find your ice time",
    text: "Tap Ice.",
    done: (v) => v.route === "ice",
  },
  {
    id: "ice",
    kind: "info",
    route: "ice",
    target: ".screen-head",
    title: "Every rink, one week",
    text: "Add your rinks and sessions once, or upload a rink's calendar file (.ics). Star the ones you want and switch to My picks to see only those. Tap a session, then Plan this, to set your slot to its length. Check the rink: MySkate only knows what you add.",
  },
  {
    id: "go-compete",
    kind: "act",
    route: "plan",
    target: '[data-action="go-compete"]',
    title: "Skating a competition?",
    text: "Tap Open on Competitions to plan the skate for an event.",
    back: { title: "Competitions start on Plan", text: "Tap Plan first. Competitions has its own card there." },
    done: (v) => v.route === "compete",
  },
  {
    id: "compete",
    kind: "info",
    route: "compete",
    target: ".cp-ttl",
    title: "Plan the whole event",
    text: "Tap New competition for its day and place, and MySkate counts down. Tap New program to choose your music and elements, place them on the rink, and tap Run it through to practice with a clock. Your event's rules come first: MySkate keeps your plan, not the rules.",
  },
  {
    id: "blade",
    kind: "info",
    route: "home",
    target: ".backstage .fl",
    title: "Blade life",
    text: "Blades go dull, so MySkate adds up your time on ice. Most skaters sharpen after 20 to 35 hours. Tap the pencil on the Blade life tile to set your own, and I just got them sharpened to start the count again. The all-time total on your skates never starts over.",
  },
  {
    id: "go-me",
    kind: "act",
    target: tabTarget("me"),
    title: "Keep your data safe",
    text: "Tap Profile.",
    done: (v) => v.route === "me",
  },
  {
    id: "backup",
    kind: "info",
    route: "me",
    target: '[data-action="export"]',
    title: "Your data stays with you",
    text: "No accounts: everything is saved in this browser, on this device. Tap Save a backup now and then (you can lock it with a passphrase) and restore it from this screen, even on a new phone. Need this tour again? Tap Show me how MySkate works.",
  },
  {
    id: "done",
    kind: "info",
    title: "That's the tour",
    text: "Nothing from practice was saved. Your own data is just as you left it.",
    next: "Start skating",
  },
];

export const stepIndex = (id, steps = TOUR_STEPS) => steps.findIndex((s) => s.id === id);

/* The first step at or after `from` that applies (its `when` is not false), or steps.length if there are none left. */
export function firstApplicable(steps, from, view) {
  let i = Math.max(0, from);
  while (i < steps.length && steps[i].when && !steps[i].when(view)) i++;
  return i;
}

/* Where the tour should be, given where it is. Two things the skater may do by another route move it on: a running session means the
   Plan steps are behind us, and a saved session means the whole first lap is. And if the step we are on no longer makes sense (its
   `requires` fails: the session was discarded, the plan emptied), go back to the nearest earlier step that does, skipping steps that
   do not apply. */
export function settle(steps, index, view) {
  const find = (id) => steps.findIndex((s) => s.id === id);
  const loop = find("loop");
  const clock = find("clock");
  if (loop >= 0 && view.state.sessions.length >= 1 && index < loop) return loop;
  if (clock >= 0 && view.state.active && index < clock) return clock;
  let i = Math.min(index, steps.length - 1);
  if (steps[i].requires && !steps[i].requires(view)) {
    do i--;
    while (i > 0 && ((steps[i].requires && !steps[i].requires(view)) || (steps[i].when && !steps[i].when(view))));
  }
  return Math.max(0, i);
}

/* Has the skater done what this step asks? Info steps are never done by themselves: they wait for Next. */
export function isDone(step, view, snap, clicked = false) {
  if (step.kind !== "act") return false;
  if (step.done && step.done(view, snap)) return true;
  return Boolean(step.click && clicked);
}

/* A made-up copy of the skater's data for the tour. It keeps who they are and how the app looks (name, levels, usual slot, blades,
   colors, light) but none of their sessions, plan, goals, or friends, and shares nothing with the real data. */
export function practiceState(real, now = new Date()) {
  const s = defaultState(now);
  const p = real.profile;
  const copy = (v) => JSON.parse(JSON.stringify(v));
  s.profile = { ...s.profile, name: p.name, levels: copy(p.levels), defaultSlotMin: p.defaultSlotMin, defaultCost: p.defaultCost, look: p.look, onboarded: true, tourSeen: true, badgesSeen: [] };
  s.blades = copy(real.blades);
  s.settings = copy(real.settings);
  s.plan = { slotMin: p.defaultSlotMin, skillIds: [] };
  return s;
}
