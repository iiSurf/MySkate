/* MySkate: loads your saved data and the skill catalog, draws the ice, and shows one screen at a time. */

import { loadCatalog } from "./catalog.js";
import { loadState, saveState, defaultState, exportJSON, exportCSV, requestPersistence } from "./store.js";
import { replayXp, levelFromXp, streakWeeks, weekBars } from "./xp.js";
import { skillStats, activeAsSession, iceSkills, totals } from "./stats.js";
import { todayISO, html } from "./util.js";
import { $, render, delegate, toast, download } from "./ui/dom.js";
import { createIce } from "./ui/ice.js";
import { levelUp as celebrateLevelUp, reducedMotion } from "./ui/celebrate.js";
import { runOnboarding } from "./ui/onboard.js";
import { newActive } from "./timer.js";
import { renderHome, homeActions, homeInputs } from "./screens/home.js";
import { renderPlan, planActions, planInputs } from "./screens/plan.js";
import { renderSkate, mountSkate, skateActions, skateInputs } from "./screens/skate.js";
import { renderProgress, progressActions } from "./screens/progress.js";
import { renderMe, mountMe, meActions, meInputs } from "./screens/me.js";

const none = () => ({});

const ROUTES = {
  home: { title: "Home", render: renderHome, actions: homeActions, inputs: homeInputs },
  plan: { title: "Plan", render: renderPlan, actions: planActions, inputs: planInputs },
  skate: { title: "Skate", render: renderSkate, mount: mountSkate, actions: skateActions, inputs: skateInputs },
  progress: { title: "Progress", render: renderProgress, actions: progressActions, inputs: none },
  me: { title: "Me", render: renderMe, mount: mountMe, actions: meActions, inputs: meInputs },
};

const screenEl = $("#screen");
const nav = $("#nav");
let ctx;
let current = "home";
let handlers = { actions: {}, inputs: {} };
let cleanup = () => {};
let ice;
let warnedSave = false;

function currentRoute() {
  const m = location.hash.match(/^#\/(\w+)/);
  return m && ROUTES[m[1]] ? m[1] : "home";
}

/* A backup or an older version may name skills this catalog does not have. Leave those out of the plan and the live session. */
function prune(state) {
  const known = (id) => ctx.catalog.skills.has(id);
  state.plan.skillIds = state.plan.skillIds.filter(known);
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

function syncIce({ animate = false } = {}) {
  const d = derive();
  ice.sync(iceSkills(ctx.catalog, d.stats, d.today), { animate });
}

function placeLens(instant) {
  const bar = $(".tabbar", nav);
  const active = $(".tab[aria-current='page']", nav);
  const lens = $(".lens", nav);
  if (!bar || !active || !lens) return;
  if (instant) lens.style.transition = "none";
  lens.style.left = active.offsetLeft + "px";
  lens.style.width = active.offsetWidth + "px";
  if (instant) {
    void lens.offsetWidth;
    lens.style.transition = "";
  }
}

function renderRoute({ keepScroll = false } = {}) {
  cleanup();
  const route = ROUTES[current];
  const y = window.scrollY;
  const blocked = ctx.flags.storageBlocked
    ? html`<section class="card nudge"><p><strong>Your browser is not letting MySkate save.</strong></p><p class="dim">This can happen in a private window. Everything works until you close this tab, so save a backup from the Me screen before you leave.</p></section>`
    : "";
  render(screenEl, html`${blocked}${route.render(ctx)}`);
  handlers = { actions: route.actions(ctx), inputs: route.inputs(ctx) };
  cleanup = route.mount ? route.mount(ctx) || (() => {}) : () => {};
  nav.querySelectorAll(".tab").forEach((t) => {
    if (t.dataset.route === current) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  placeLens(false);
  document.title = `${route.title} · MySkate`;
  if (keepScroll) window.scrollTo(0, y);
}

function go(route) {
  if (!ROUTES[route]) return;
  if (location.hash === `#/${route}`) {
    renderRoute();
    return;
  }
  location.hash = `#/${route}`;
}

function onRouteChange() {
  current = currentRoute();
  renderRoute();
  window.scrollTo(0, 0);
  screenEl.focus({ preventScroll: true });
}

function save() {
  const ok = saveState(ctx.state);
  if (!ok && !warnedSave) {
    warnedSave = true;
    toast("Could not save in this browser. Save a backup from the Me screen.", 6000);
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
    syncIce,
    setState(next) {
      ctx.state = next;
      prune(ctx.state);
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
      const now = new Date();
      download(`myskate-backup-${todayISO(now)}.json`, exportJSON(ctx.state, now), "application/json");
      ctx.state.backup.lastExportAt = now.toISOString();
      save();
      toast("Backup saved. Look in your downloads.");
      renderRoute({ keepScroll: true });
    },
    exportCSV() {
      download(`myskate-ratings-${todayISO()}.csv`, exportCSV(ctx.state, ctx.catalog), "text/csv");
      toast("Spreadsheet saved. Look in your downloads.");
    },
    levelUp: (level) => celebrateLevelUp(level),
    async startOnboarding() {
      await runOnboarding(ctx);
      applySettings();
      syncIce({});
      renderRoute();
      requestPersistence();
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
  addEventListener("resize", () => placeLens(true));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeLens(true));
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
  prune(ctx.state);
  applySettings();
  ice = createIce($("#ice"), reducedMotion);
  syncIce({});
  bindEvents();
  current = currentRoute();
  renderRoute();
  if (status === "recovered") toast("Your saved data could not be read. A copy was kept aside and MySkate started fresh.", 8000);
  if (!ctx.state.profile.onboarded) ctx.startOnboarding();
  window.myskate = ctx;
}

boot();
