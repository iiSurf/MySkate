/* Saved data: the shape, loading and saving, backup files, and merging an old backup into newer progress.
   Anything that comes from a file is untrusted, so every field is checked and trimmed before it is used. */

import { sanitizeCost } from "./cost.js";
import { sanitizeFriend, MAX_FRIENDS } from "./friends.js";
import { sanitizeTestGoal, sanitizeChecks } from "./testprep.js";
import { sanitizeGoals } from "./goals.js";
import { sanitizeHomeworkList } from "./homework.js";
import { sanitizeOffIceList } from "./office.js";
import { sanitizeLookId, DEFAULT_LOOK } from "./looks.js";
import { cleanCompete } from "./compete.js";
import { sanitizeRink, sanitizeIceSession, sanitizeIceView, defaultIceView, LIMITS as ICE_LIMITS } from "./ice.js";

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "myskate.v1";
export const LIGHTS = ["sunrise", "golden", "midday", "dusk"];

const MAX = { name: 80, note: 1000, id: 80, skillId: 120, levelKey: 120 };

const str = (v, max, fallback = "") => (typeof v === "string" ? v.slice(0, max) : fallback);
const num = (v, lo, hi, fallback) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const isoDay = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const isoStamp = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v.slice(0, 40) : null);

export function defaultState(now = new Date()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    profile: {
      name: "",
      levels: { skills: "lts-freeskate/pre-free-skate", jumps: "lts-freeskate/pre-free-skate" },
      defaultSlotMin: 60,
      onboarded: false,
      tourSeen: false,
      defaultCost: null,
      badgesSeen: null,
      cardId: "",
      test: null,
      look: DEFAULT_LOOK,
    },
    blades: { name: "", limitHours: 25, baseHours: 0, countedFrom: now.toISOString() },
    sharpenings: [],
    sessions: [],
    plan: { slotMin: 60, skillIds: [] },
    cues: {},
    friends: [],
    testChecks: {},
    goals: [],
    homework: [],
    offIce: [],
    events: [],
    programs: [],
    rinks: [],
    iceSessions: [],
    iceView: defaultIceView(),
    settings: { light: "golden", contrast: false },
    backup: { lastExportAt: null },
    active: null,
  };
}

function sanitizeEntry(e) {
  if (!e || typeof e !== "object") return null;
  const skillId = str(e.skillId, MAX.skillId);
  if (!skillId) return null;
  const attempts = Math.round(num(e.attempts, 0, 9999, 0));
  const landed = Math.min(attempts, Math.round(num(e.landed, 0, 9999, 0)));
  const entry = { skillId, stars: Math.round(num(e.stars, 0, 5, 0)), landed, attempts, note: str(e.note, MAX.note) };
  /* The order of landed (L) and missed (M) tries, kept only while a session is in progress so the last try can be undone. */
  if (typeof e.seq === "string" && /^[LM]*$/.test(e.seq)) entry.seq = e.seq.slice(-200);
  return entry;
}

function sanitizeSession(s) {
  if (!s || typeof s !== "object") return null;
  const id = str(s.id, MAX.id);
  const date = isoDay(s.date);
  if (!id || !date) return null;
  return {
    id,
    date,
    startedAt: isoStamp(s.startedAt) || `${date}T12:00:00.000Z`,
    bookedMin: Math.round(num(s.bookedMin, 0, 600, 0)),
    onIceSec: Math.round(num(s.onIceSec, 0, 86400, 0)),
    entries: (Array.isArray(s.entries) ? s.entries : []).map(sanitizeEntry).filter(Boolean).slice(0, 200),
    note: str(s.note, MAX.note),
    cost: sanitizeCost(s.cost),
  };
}

function sanitizeActive(a) {
  if (!a || typeof a !== "object") return null;
  const id = str(a.id, MAX.id);
  if (!id || !Number.isFinite(a.startedAt)) return null;
  const entries = {};
  if (a.entries && typeof a.entries === "object") {
    for (const [k, v] of Object.entries(a.entries).slice(0, 200)) {
      const clean = sanitizeEntry({ ...v, skillId: k });
      if (clean) entries[k] = clean;
    }
  }
  const order = (Array.isArray(a.order) ? a.order : []).map((x) => str(x, MAX.skillId)).filter(Boolean).slice(0, 80);
  return {
    id,
    startedAt: a.startedAt,
    bookedMin: Math.round(num(a.bookedMin, 0, 600, 60)),
    order,
    index: Math.round(num(a.index, 0, Math.max(0, order.length - 1), 0)),
    entries,
    running: Boolean(a.running) && Number.isFinite(a.runStart),
    runStart: Number.isFinite(a.runStart) ? a.runStart : null,
    accumMs: num(a.accumMs, 0, 86400000, 0),
  };
}

/* Rinks and their sessions: bad entries and repeats are dropped, and a session whose rink is gone goes with it. */
function cleanIce(rawRinks, rawSessions) {
  const once = (list, clean, limit) => {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).map(clean).filter((x) => x && !seen.has(x.id) && seen.add(x.id)).slice(0, limit);
  };
  const rinks = once(rawRinks, sanitizeRink, ICE_LIMITS.rinks);
  const known = new Set(rinks.map((r) => r.id));
  const iceSessions = once(rawSessions, sanitizeIceSession, ICE_LIMITS.sessions).filter((x) => known.has(x.rinkId));
  return { rinks, iceSessions };
}

/* Build a clean state from anything: a stored copy or an imported file. Missing parts fall back to defaults. */
export function sanitizeState(data, { keepActive = false, now = new Date() } = {}) {
  const base = defaultState(now);
  const src = data && typeof data === "object" ? data : {};
  const p = src.profile && typeof src.profile === "object" ? src.profile : {};
  const lv = p.levels && typeof p.levels === "object" ? p.levels : {};
  const b = src.blades && typeof src.blades === "object" ? src.blades : {};
  const plan = src.plan && typeof src.plan === "object" ? src.plan : {};
  const settings = src.settings && typeof src.settings === "object" ? src.settings : {};

  const seen = new Set();
  const sessions = (Array.isArray(src.sessions) ? src.sessions : [])
    .map(sanitizeSession)
    .filter((s) => s && !seen.has(s.id) && seen.add(s.id))
    .sort((a, c) => a.startedAt.localeCompare(c.startedAt));

  const cues = {};
  if (src.cues && typeof src.cues === "object") {
    for (const [k, v] of Object.entries(src.cues).slice(0, 500)) {
      if (typeof v === "string" && v.trim()) cues[str(k, MAX.skillId)] = v.slice(0, MAX.note);
    }
  }

  const { rinks, iceSessions } = cleanIce(src.rinks, src.iceSessions);
  const { events, programs } = cleanCompete(src.events, src.programs);
  const iceView = sanitizeIceView(src.iceView);
  iceView.rinkIds = iceView.rinkIds.filter((id) => rinks.some((r) => r.id === id));

  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: isoStamp(src.createdAt) || base.createdAt,
    profile: {
      name: str(p.name, MAX.name),
      levels: {
        skills: str(lv.skills, MAX.levelKey, base.profile.levels.skills),
        jumps: str(lv.jumps, MAX.levelKey, base.profile.levels.jumps),
      },
      defaultSlotMin: Math.round(num(p.defaultSlotMin, 5, 300, 60)),
      onboarded: p.onboarded === true,
      tourSeen: p.tourSeen === true,
      defaultCost: sanitizeCost(p.defaultCost),
      badgesSeen: Array.isArray(p.badgesSeen) ? [...new Set(p.badgesSeen.map((x) => str(x, 60)).filter(Boolean))].slice(0, 100) : null,
      cardId: str(p.cardId, MAX.id),
      test: sanitizeTestGoal(p.test),
      look: sanitizeLookId(p.look),
    },
    blades: {
      name: str(b.name, MAX.name),
      limitHours: num(b.limitHours, 5, 100, 25),
      baseHours: num(b.baseHours, 0, 500, 0),
      countedFrom: isoStamp(b.countedFrom) || base.blades.countedFrom,
    },
    sharpenings: (Array.isArray(src.sharpenings) ? src.sharpenings : [])
      .map((s) => (s && isoDay(s.date) ? { date: s.date, hours: num(s.hours, 0, 500, 0) } : null))
      .filter(Boolean)
      .slice(0, 200),
    sessions,
    plan: {
      slotMin: Math.round(num(plan.slotMin, 5, 300, 60)),
      skillIds: (Array.isArray(plan.skillIds) ? plan.skillIds : []).map((x) => str(x, MAX.skillId)).filter(Boolean).slice(0, 40),
      cost: sanitizeCost(plan.cost),
    },
    cues,
    friends: (Array.isArray(src.friends) ? src.friends : []).map(sanitizeFriend).filter(Boolean).slice(0, MAX_FRIENDS),
    testChecks: sanitizeChecks(src.testChecks),
    goals: sanitizeGoals(src.goals),
    homework: sanitizeHomeworkList(src.homework),
    offIce: sanitizeOffIceList(src.offIce),
    events,
    programs,
    rinks,
    iceSessions,
    iceView,
    settings: { light: LIGHTS.includes(settings.light) ? settings.light : "golden", contrast: settings.contrast === true },
    backup: { lastExportAt: keepActive ? isoStamp(src.backup && src.backup.lastExportAt) : null },
    active: keepActive ? sanitizeActive(src.active) : null,
  };
}

/* Loading and saving. Storage can be blocked or full, so every call is guarded. */

export function loadState(storage = globalThis.localStorage) {
  let text = null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch (err) {
    return { state: defaultState(), status: "unavailable" };
  }
  if (!text) return { state: defaultState(), status: "new" };
  try {
    const data = JSON.parse(text);
    if (typeof data.schemaVersion === "number" && data.schemaVersion > SCHEMA_VERSION) throw new Error("newer");
    return { state: sanitizeState(data, { keepActive: true }), status: "ok" };
  } catch (err) {
    try {
      storage.setItem(STORAGE_KEY + ".damaged", text);
    } catch (e) {
      /* nothing more to do */
    }
    return { state: defaultState(), status: "recovered" };
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    return false;
  }
}

/* Backup files */

export function exportJSON(state, now = new Date()) {
  const { active, backup, ...rest } = state;
  return JSON.stringify({ app: "MySkate", exportedAt: now.toISOString(), ...rest }, null, 2);
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: "That file is not readable. Pick a MySkate backup (.json)." };
  }
  if (data && data.app === "MySkate" && data.encrypted === true) {
    return { ok: false, error: "That backup is locked with a passphrase. Pick it again and MySkate will ask for the passphrase." };
  }
  if (!data || typeof data !== "object" || typeof data.schemaVersion !== "number" || !Array.isArray(data.sessions)) {
    return { ok: false, error: "That file does not look like a MySkate backup." };
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: "That backup was made by a newer version of MySkate. Update the app first." };
  }
  const state = sanitizeState(data);
  const dates = state.sessions.map((s) => s.date).sort();
  return { ok: true, state, summary: { sessions: state.sessions.length, first: dates[0] || null, last: dates[dates.length - 1] || null } };
}

/* Merge an imported backup into what is already here. Newer progress is never lost and nothing is duplicated. */
export function mergeStates(current, incoming) {
  const merged = structuredCloneSafe(current);
  const ids = new Set(current.sessions.map((s) => s.id));
  const added = incoming.sessions.filter((s) => !ids.has(s.id));
  merged.sessions = [...current.sessions, ...added].sort((a, c) => a.startedAt.localeCompare(c.startedAt));

  const sharpKey = (s) => `${s.date}|${s.hours}`;
  const sharp = new Map(current.sharpenings.map((s) => [sharpKey(s), s]));
  incoming.sharpenings.forEach((s) => sharp.has(sharpKey(s)) || sharp.set(sharpKey(s), s));
  merged.sharpenings = [...sharp.values()].sort((a, c) => a.date.localeCompare(c.date));

  merged.cues = { ...incoming.cues, ...current.cues };
  merged.testChecks = { ...incoming.testChecks, ...current.testChecks };
  /* One goal per skill: yours win, and a goal for a skill you have no goal for is added. */
  const goalSkills = new Set(current.goals.map((g) => g.skillId));
  merged.goals = sanitizeGoals([...current.goals, ...incoming.goals.filter((g) => !goalSkills.has(g.skillId))]);
  /* Homework: yours win by id, and homework you do not have is added. */
  const hwIds = new Set(current.homework.map((h) => h.id));
  merged.homework = sanitizeHomeworkList([...current.homework, ...incoming.homework.filter((h) => !hwIds.has(h.id))]);
  /* Off-ice workouts: yours win by id, and ones you do not have are added. */
  const offIds = new Set(current.offIce.map((e) => e.id));
  merged.offIce = sanitizeOffIceList([...current.offIce, ...incoming.offIce.filter((e) => !offIds.has(e.id))]);

  /* Competitions and programs: yours win by id, and ones you do not have are added. */
  const compete = cleanCompete(
    [...current.events, ...incoming.events.filter((e) => !current.events.some((x) => x.id === e.id))],
    [...current.programs, ...incoming.programs.filter((p) => !current.programs.some((x) => x.id === p.id))]
  );
  merged.events = compete.events;
  merged.programs = compete.programs;

  /* Rinks and sessions you already have win over the file's copy of the same one; the rest are added. */
  const ice = cleanIce([...current.rinks, ...incoming.rinks], [...current.iceSessions, ...incoming.iceSessions]);
  merged.rinks = ice.rinks;
  merged.iceSessions = ice.iceSessions;
  merged.iceView = sanitizeIceView({ ...current.iceView });

  const friendIds = new Set(current.friends.map((f) => f.id));
  merged.friends = [...current.friends, ...incoming.friends.filter((f) => !friendIds.has(f.id))];

  if (!current.profile.onboarded && incoming.profile.onboarded) {
    merged.profile = incoming.profile;
    merged.blades = incoming.blades;
    merged.plan = incoming.plan;
    merged.settings = incoming.settings;
  }
  return { state: merged, addedSessions: added.length };
}

export function replaceState(incoming, current) {
  const next = structuredCloneSafe(incoming);
  next.backup = { lastExportAt: current && current.backup ? current.backup.lastExportAt : null };
  next.active = null;
  next.profile.onboarded = true;
  next.profile.tourSeen = true;   // someone restoring a backup already knows the app
  return next;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

/* A spreadsheet export, one row per skill rating. Cells that start like a formula get a leading apostrophe. */
export function exportCSV(state, catalog) {
  const header = ["date", "booked_min", "on_ice_min", "track", "level", "skill", "type", "skates", "landed", "attempts", "note", "session_cost"];
  const cell = (v) => {
    let text = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const rows = [header.join(",")];
  for (const s of state.sessions) {
    for (const e of s.entries) {
      const sk = catalog && catalog.skills.get(e.skillId);
      rows.push(
        [
          s.date,
          s.bookedMin,
          Math.round((s.onIceSec / 60) * 10) / 10,
          sk ? sk.trackName : "",
          sk ? sk.levelName : "",
          sk ? sk.name : e.skillId,
          sk ? sk.cat : "",
          e.stars,
          e.landed,
          e.attempts,
          e.note,
          s.cost === null || s.cost === undefined ? "" : s.cost,
        ]
          .map(cell)
          .join(",")
      );
    }
  }
  return rows.join("\n") + "\n";
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (err) {
    /* not supported */
  }
  return false;
}
