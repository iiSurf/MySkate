import test from "node:test";
import assert from "node:assert/strict";
import { html, raw, esc } from "../js/util.js";
import { trackTypeFor, buildTrack } from "../js/ice-tracks.js";
import { levelProgress, skillStats, isSkating, isAir } from "../js/stats.js";
import { sanitizeState } from "../js/store.js";
import { realCatalog, session } from "./helpers.js";

const catalog = realCatalog();

test("html escapes everything that is interpolated, including quotes in attributes", () => {
  const evil = `<img src=x onerror="alert('hi')"> & more`;
  const out = html`<p title="${evil}">${evil}</p>`.text;
  assert.ok(!out.includes("<img"), "no raw tag gets through");
  assert.ok(!out.includes('"alert'), "a quote cannot close the attribute");
  assert.match(out, /&lt;img src=x onerror=&quot;alert\(&#39;hi&#39;\)&quot;&gt; &amp; more/);
});

test("html keeps nested markup and arrays, and does not escape them twice", () => {
  const item = (n) => html`<li>${n}</li>`;
  assert.equal(html`<ul>${[1, 2].map(item)}</ul>`.text, "<ul><li>1</li><li>2</li></ul>");
  assert.equal(html`${raw("<b>ok</b>")}`.text, "<b>ok</b>");
  assert.equal(esc("<&>"), "&lt;&amp;&gt;");
});

test("html prints booleans so ARIA states are never empty, and drops null and undefined", () => {
  assert.equal(html`aria-pressed="${false}"`.text, 'aria-pressed="false"');
  assert.equal(html`aria-pressed="${true}"`.text, 'aria-pressed="true"');
  assert.equal(html`a${null}b${undefined}c${0}`.text, "abc0");
});

test("skills get the ice pattern their name suggests", () => {
  const type = (name, cat = "skills") => trackTypeFor({ name, cat });
  assert.equal(type("Forward swizzles (6-8 in a row)"), "swizzle");
  assert.equal(type("Forward crossovers (clockwise and counterclockwise)"), "scallop");
  assert.equal(type("Hockey stop (both directions)"), "stop");
  assert.equal(type("T-stops (right and left)"), "stop");
  assert.equal(type("Forward outside three-turn (right and left)"), "turn");
  assert.equal(type("Five-step mohawk sequence"), "mohawk");
  assert.equal(type("Forward Twizzles"), "twizzle");
  assert.equal(type("Waltz eight"), "eight");
  assert.equal(type("Forward spiral on a straight line"), "spiral");
  assert.equal(type("Creative step sequence"), "steps");
  assert.equal(type("Waltz jump", "jumps"), "edgeJump");
  assert.equal(type("Toe loop", "jumps"), "toeJump");
  assert.equal(type("Bunny hop", "jumps"), "hop");
  assert.equal(type("Camel spin", "spins"), "spin");
});

test("counterclockwise is not mistaken for a counter turn", () => {
  const name = "Moving backward-to-forward two-foot turn on a circle (clockwise and counterclockwise)";
  assert.equal(trackTypeFor({ name, cat: "skills" }), "circle");
  assert.equal(trackTypeFor({ name: "Forward and Backward Outside Counters", cat: "skills" }), "turn");
});

test("every skill in the catalog can be drawn, with finite coordinates", () => {
  for (const skill of catalog.skills.values()) {
    const track = buildTrack(skill);
    assert.ok(track.paths.length > 0, skill.id);
    for (const d of track.paths) assert.ok(!/NaN|Infinity/.test(d), skill.id);
  }
});

test("the jump and spin library counts its progress across the whole library", () => {
  const library = [...catalog.skills.values()].filter((s) => s.trackId === "library");
  const earned = library.slice(0, 3).map((s) => s.id);
  const stats = skillStats([session("2026-10-14", { onIceSec: 0, stars: Object.fromEntries(earned.map((id) => [id, 5])) })]);
  const p = levelProgress(catalog, "library", stats);
  assert.equal(p.total, library.length);
  assert.equal(p.earned, 3);
  const air = levelProgress(catalog, "library", stats, isAir);
  const skating = levelProgress(catalog, "library", stats, isSkating);
  assert.equal(air.total + skating.total, library.length);
});

test("a session in progress with broken times is dropped or paused instead of showing NaN", () => {
  const base = { id: "a", bookedMin: 45, order: ["x"], index: 0, entries: {}, accumMs: 0 };
  assert.equal(sanitizeState({ active: { ...base, startedAt: NaN, running: true, runStart: 1 } }, { keepActive: true }).active, null);
  assert.equal(sanitizeState({ active: { ...base, startedAt: null, running: false, runStart: null } }, { keepActive: true }).active, null);
  const paused = sanitizeState({ active: { ...base, startedAt: 1000, running: true, runStart: Infinity } }, { keepActive: true }).active;
  assert.equal(paused.running, false, "a running clock with no valid start is paused");
  assert.equal(paused.runStart, null);
  const ok = sanitizeState({ active: { ...base, startedAt: 1000, running: true, runStart: 1000 } }, { keepActive: true }).active;
  assert.equal(ok.running, true);
});
