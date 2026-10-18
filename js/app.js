/* MySkate: loads your saved data and the skill catalog, and shows one screen at a time. */

import { loadCatalog } from "./catalog.js";
import { loadState, saveState, exportJSON, exportCSV, requestPersistence } from "./store.js";
import { replayXp, levelFromXp, streakWeeks, weekBars } from "./xp.js";
import { skillStats, activeAsSession, totals } from "./stats.js";
import { todayISO, html, uid } from "./util.js";
import { $, render, delegate, toast, download } from "./ui/dom.js";
import { levelUp as celebrateLevelUp, badgeUnlock, cheer } from "./ui/celebrate.js";
import { shareBadge } from "./ui/share.js";
import { evaluateBadges, newlyEarned } from "./badges.js";
import { goalStatus } from "./goals.js";
import { homeworkDoneDates } from "./homework.js";
import { makeCard, parseFriendHash } from "./friends.js";
import { encryptBackup } from "./crypto.js";
import { resolveLook } from "./looks.js";
import { openAddFriend } from "./ui/friends.js";
import { runOnboarding } from "./ui/onboard.js";
import { offerTour, runGuide } from "./ui/coach.js";
import { practiceState } from "./tour.js";
import { newActive } from "./timer.js";
import { keepAwake } from "./wake.js";
import { renderHome, homeActions, homeInputs } from "./screens/home.js";
import { renderPlan, planActions, planInputs } from "./screens/plan.js";
import { renderIce, iceActions } from "./screens/ice.js";
import { dropEnded } from "./ice.js";
import { renderSkate, mountSkate, skateActions, skateInputs } from "./screens/skate.js";
import { renderProgress, progressActions, showFriends } from "./screens/progress.js";
import { renderMe, mountMe, meActions, meInputs } from "./screens/me.js";
import { renderCompete, mountCompete, competeActions, competeInputs } from "./screens/compete.js";

const none = () => ({});

const ROUTES = {
  home: { title: "Home", render: renderHome, actions: homeActions, inputs: homeInputs },
  ice: { title: "Ice times", render: renderIce, actions: iceActions, inputs: none },
  plan: { title: "Plan", render: renderPlan, actions: planActions, inputs: planInputs },
  skate: { title: "Skate", render: renderSkate, mount: mountSkate, actions: skateActions, inputs: skateInputs },
  progress: { title: "Progress", render: renderProgress, actions: progressActions, inputs: none },
  me: { title: "Profile", render: renderMe, mount: mountMe, actions: meActions, inputs: meInputs },
  /* Competitions has no tab of its own: you reach it from Home and Plan, and Plan stays lit while you are in it. */
  compete: { title: "Competitions", render: renderCompete, mount: mountCompete, actions: competeActions, inputs: competeInputs, nav: "plan" },
};

const screenEl = $("#screen");
const nav = $("#nav");
let ctx;
let current = "home";
let handlers = { actions: {}, inputs: {} };
let cleanup = () => {};
let warnedSave = false;

function currentRoute() {
  const m = location.hash.match(/^#\/(\w+)/);
  return m && ROUTES[m[1]] ? m[1] : "home";
}

/* A backup or an older version may name skills this catalog does not have. Leave those out of the plan and the live session. */
function prune(state) {
  const known = (id) => ctx.catalog.skills.has(id);
  state.plan.skillIds = state.plan.skillIds.filter(known);
  /* Ice times keeps only the present and future, including after a backup is restored. */
  state.iceSessions = dropEnded(state.iceSessions);
  if (state.active) {
    state.active.order = state.active.order.filter(known);
    if (state.active.order.length === 0) state.active = null;
    else state.active.index = Math.min(state.active.index, state.active.order.length - 1);
  }
}

function applySettings() {
  const s = ctx.state.settings;
  document.documentElement.dataset.light = s.light;
  if (s.contrast) document.documentElement.dataset.contrast = "high";
  else document.documentElement.removeAttribute("data-contrast");
}

function derive() {
  const { state } = ctx;
  const today = todayISO();
  const stats = skillStats(state.active ? [...state.sessions, activeAsSession(state.active, today)] : state.sessions);
  const xp = replayXp(state.sessions);
  return {
    today,
    stats,
    xp,
    level: levelFromXp(xp.total),
    streak: streakWeeks(state.sessions, today),
    bars: weekBars(state.sessions, xp.bySession, today),
    totals: totals(state.sessions, today),
  };
}

/* A selector that finds the same control again after the screen is rebuilt. */
function focusSelector(el) {
  if (!el || !screenEl.contains(el)) return null;
  const control = el.closest("[data-action], [data-input]");
  if (!control) return null;
  const parts = Object.entries(control.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${CSS.escape(v)}"]`);
  return parts.join("");
}

function renderRoute({ keepScroll = false } = {}) {
  cleanup();
  const route = ROUTES[current];
  const y = window.scrollY;
  const refocus = keepScroll ? focusSelector(document.activeElement) : null;
  const blocked = ctx.flags.storageBlocked
    ? html`<section class="card nudge"><p><strong>Your browser is not letting MySkate save.</strong></p><p class="dim">This can happen in a private window. Everything works until you close this tab, so save a backup from Profile before you leave.</p></section>`
    : "";
  render(screenEl, html`${blocked}${route.render(ctx)}`);
  handlers = { actions: route.actions(ctx), inputs: route.inputs(ctx) };
  cleanup = route.mount ? route.mount(ctx) || (() => {}) : () => {};
  nav.querySelectorAll(".tab").forEach((t) => {
    if (t.dataset.route === (route.nav || current)) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  document.title = `${route.title} · MySkate`;
  document.documentElement.dataset.route = current;
  if (keepScroll) window.scrollTo(0, y);
  if (refocus) {
    const again = screenEl.querySelector(refocus);
    if (again) again.focus({ preventScroll: true });
  }
}

function go(route) {
  if (!ROUTES[route]) return;
  if (location.hash === `#/${route}`) {
    renderRoute();
    return;
  }
  location.hash = `#/${route}`;
}

/* A friend's link (#/friend?c=...) was opened: go to the friends board and offer to add them. Returns true if it was one. */
async function handleFriendLink() {
  if (!location.hash.startsWith("#/friend")) return false;
  const card = parseFriendHash(location.hash);
  history.replaceState(null, "", location.pathname + location.search + "#/progress");
  showFriends();
  current = currentRoute();
  renderRoute();
  if (card) await openAddFriend(ctx, card);
  else toast("That friend link did not work. Ask your friend to send it again.", 5000);
  return true;
}

function onRouteChange() {
  if (location.hash.startsWith("#/friend")) {
    handleFriendLink();
    return;
  }
  current = currentRoute();
  renderRoute();
  window.scrollTo(0, 0);
  screenEl.focus({ preventScroll: true });
}

function save() {
  /* Practice mode (the guided tour) works on a made-up copy of your data, and none of it is kept. */
  if (ctx.practice) return;
  const ok = saveState(ctx.state);
  if (!ok && !warnedSave) {
    warnedSave = true;
    toast("Could not save in this browser. Save a backup from Profile.", 6000);
  }
}

function buildContext(state, catalog, status) {
  return {
    state,
    catalog,
    flags: { storageBlocked: status === "unavailable" },
    derive,
    save,
    go,
    update: () => renderRoute({ keepScroll: true }),
    applySettings,
    setState(next) {
      ctx.state = next;
      prune(ctx.state);
      keepAwake(Boolean(ctx.state.active && ctx.state.active.running));
    },
    togglePlan(id) {
      const ids = ctx.state.plan.skillIds;
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1);
      else if (ids.length >= 20) toast("A plan holds up to 20 skills.");
      else ids.push(id);
      save();
    },
    startSession() {
      if (ctx.state.active) return go("skate");
      if (!ctx.state.plan.skillIds.length) {
        toast("Pick a few skills first.");
        return go("plan");
      }
      ctx.state.active = newActive({ order: ctx.state.plan.skillIds, bookedMin: ctx.state.plan.slotMin });
      save();
      go("skate");
    },
    exportBackup() {
      if (ctx.practice) return toast("That works for real after the tour. Nothing is saved in practice.");
      const now = new Date();
      download(`myskate-backup-${todayISO(now)}.json`, exportJSON(ctx.state, now), "application/json");
      ctx.state.backup.lastExportAt = now.toISOString();
      save();
      toast("Backup saved. Look in your downloads.");
      renderRoute({ keepScroll: true });
      ctx.checkBadges();
    },
    /* A backup locked with a passphrase. The lock takes a moment, so this is async; it throws if it could not lock. */
    async exportBackupLocked(passphrase) {
      if (ctx.practice) return toast("That works for real after the tour. Nothing is saved in practice.");
      const now = new Date();
      const file = await encryptBackup(exportJSON(ctx.state, now), passphrase, { now });
      download(`myskate-backup-${todayISO(now)}-locked.json`, file, "application/json");
      ctx.state.backup.lastExportAt = now.toISOString();
      save();
      toast("Locked backup saved. Look in your downloads, and keep the passphrase safe.", 5000);
      renderRoute({ keepScroll: true });
      ctx.checkBadges();
    },
    exportCSV() {
      if (ctx.practice) return toast("That works for real after the tour. Nothing is saved in practice.");
      /* The byte-order mark makes Excel read accents and curly quotes in notes correctly. */
      download(`myskate-ratings-${todayISO()}.csv`, "\uFEFF" + exportCSV(ctx.state, ctx.catalog), "text/csv");
      toast("Spreadsheet saved. Look in your downloads.");
    },
    levelUp: (level) => (ctx.practice ? undefined : celebrateLevelUp(level)),
    /* A quick skating cheer for finishing something (see ui/celebrate.js). Held back in practice, like the other celebrations. */
    cheer: (opts) => (ctx.practice ? Promise.resolve() : cheer(opts)),
    /* What counts toward unlocking colors: your level and the badges you have earned. */
    lookHave: () => ({ level: derive().level.level, badgeIds: ctx.badges().filter((b) => b.earned).map((b) => b.id) }),
    /* The color to use for you: your choice if it is unlocked, otherwise the default. */
    look: () => resolveLook(ctx.state.profile.look, ctx.lookHave()),
    /* Your friend card as of now. The card id is made the first time it is needed and stays with your data. */
    myCard() {
      const p = ctx.state.profile;
      if (!p.cardId) {
        p.cardId = uid();
        save();
      }
      const d = derive();
      return makeCard({ id: p.cardId, name: p.name, level: d.level.level, xpTotal: d.xp.total, xpWeek: d.bars.reduce((sum, b) => sum + b.xp, 0), streak: d.streak.weeks, badges: ctx.badges().filter((b) => b.earned).length, hours: d.totals.allMin / 60, look: ctx.look().id });
    },
    /* Every badge with whether it is earned and when, worked out from the saved sessions. */
    badges() {
      const stats = skillStats(ctx.state.sessions);
      const today = todayISO();
      const goalDates = ctx.state.goals.map((g) => goalStatus(g, stats, today)).filter((g) => g.met).map((g) => g.metOn);
      return evaluateBadges({ sessions: ctx.state.sessions, sharpenings: ctx.state.sharpenings, backupAt: ctx.state.backup.lastExportAt, catalog: ctx.catalog, goalDates, homeworkDates: homeworkDoneDates(ctx.state.homework), offIce: ctx.state.offIce });
    },
    /* Tell the skater about badges earned since the last look. The first time (and after a restore) it only notes what is
       already earned, so old progress does not set off a pile of celebrations. */
    async checkBadges({ silent = false } = {}) {
      if (ctx.practice) return;
      const list = ctx.badges();
      const ids = list.filter((b) => b.earned).map((b) => b.id);
      const p = ctx.state.profile;
      if (silent || p.badgesSeen === null) {
        p.badgesSeen = [...new Set([...(p.badgesSeen || []), ...ids])];
        save();
        return;
      }
      const fresh = newlyEarned(list, p.badgesSeen);
      if (!fresh.length) return;
      p.badgesSeen = [...new Set([...p.badgesSeen, ...ids])];
      save();
      await badgeUnlock(fresh, { onShare: (b) => shareBadge(b, p.name) });
    },
    async startOnboarding() {
      await runOnboarding(ctx);
      applySettings();
      renderRoute();
      requestPersistence();
      await ctx.checkBadges({ silent: true });
      await ctx.showTour({ firstTime: true });
    },
    /* Practice mode: the app shows a made-up copy of your data and keeps none of what happens, so the guided tour can have you really
       plan, skate, and save a session without touching your own. Your data is put back when it ends. */
    beginPractice() {
      if (ctx.practice) return;
      const real = ctx.state;
      ctx.practice = { real };
      ctx.setState(practiceState(real));
      applySettings();
    },
    endPractice() {
      if (!ctx.practice) return;
      const { real } = ctx.practice;
      ctx.practice = null;
      ctx.setState(real);
      applySettings();
    },
    /* The guided tour. The first time (firstTime) it is offered once, and turning it down counts as seen. Any other time it just starts. */
    async showTour({ firstTime = false } = {}) {
      if (ctx.practice) {
        if (!firstTime) toast("You are already in the tour. Follow the sparkles.");
        return;
      }
      if (firstTime && ctx.state.profile.tourSeen) return;
      const go = firstTime ? await offerTour() : true;
      if (!ctx.state.profile.tourSeen) {
        ctx.state.profile.tourSeen = true;
        save();
      }
      if (go) await runGuide(ctx);
    },
  };
}

function bindEvents() {
  delegate(screenEl, "click", (name, el, event) => {
    const fn = handlers.actions[name];
    if (fn) fn(el, event);
  });
  screenEl.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    const el = event.target.closest("[role='checkbox'][data-action], [role='button'][data-action]");
    if (el) {
      event.preventDefault();
      el.click();
    }
  });
  const onInput = (event) => {
    const el = event.target.closest("[data-input]");
    if (!el) return;
    const fn = handlers.inputs[el.dataset.input];
    if (fn) fn(el, event);
  };
  screenEl.addEventListener("input", onInput);
  screenEl.addEventListener("change", onInput);
  addEventListener("hashchange", onRouteChange);
}

function showFatal(error) {
  render(
    screenEl,
    html`<section class="card"><h2>MySkate could not load</h2><p class="dim">The skill lists did not load. Check your connection and try again.</p><button class="btn" type="button" id="retry">Try again</button></section>`
  );
  $("#retry").addEventListener("click", () => location.reload());
  console.error(error);
}

async function boot() {
  const { state, status } = loadState();
  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    showFatal(error);
    return;
  }
  ctx = buildContext(state, catalog, status);
  const iceBefore = state.iceSessions.length;
  prune(ctx.state);
  if (ctx.state.iceSessions.length !== iceBefore) save();   // sessions that have passed are gone from storage too
  applySettings();
  bindEvents();
  current = currentRoute();
  renderRoute();
  if (status === "recovered") toast("Your saved data could not be read. A copy was kept aside and MySkate started fresh.", 8000);
  ctx.checkBadges({ silent: true });
  window.myskate = ctx;
  /* New here: set up first (a friend's link waits until then). Otherwise a friend's link comes first, then the tour if it is new. */
  if (!ctx.state.profile.onboarded) await ctx.startOnboarding();
  const wasLink = await handleFriendLink();
  if (!wasLink && ctx.state.profile.onboarded && !ctx.state.active) ctx.showTour({ firstTime: true });
}

boot();
