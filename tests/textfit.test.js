import test from "node:test";
import assert from "node:assert/strict";
import { breakLines, fitLines } from "../js/textfit.js";

/* Every character is half as wide as the size, like a simple font. */
const measure = (text, size = 10) => text.length * size * 0.5;
const at = (size) => (t) => measure(t, size);

test("words break at spaces into lines no wider than the space", () => {
  assert.deepEqual(breakLines("one two three four", 50, at(10)), ["one", "two", "three", "four"].reduce((lines, w) => { const l = lines[lines.length - 1]; if (l && (l + " " + w).length * 5 <= 50) lines[lines.length - 1] = l + " " + w; else lines.push(w); return lines; }, []));
  assert.deepEqual(breakLines("a b", 1000, at(10)), ["a b"]);
  assert.deepEqual(breakLines("", 100, at(10)), []);
  assert.deepEqual(breakLines("   ", 100, at(10)), []);
});

test("a word wider than the space is broken between letters instead of running off", () => {
  const lines = breakLines("x".repeat(30), 50, at(10));
  assert.ok(lines.length >= 3);
  assert.ok(lines.every((l) => measure(l, 10) <= 50));
  assert.equal(lines.join(""), "x".repeat(30), "no letters are lost");
});

test("the biggest size that fits is chosen", () => {
  const fit = fitLines("Moonlight", { maxWidth: 400, maxLines: 1, sizes: [100, 80, 60, 40], measure });
  assert.equal(fit.size, 80, "9 letters at 80 is 360 wide, and at 100 is 450");
  assert.deepEqual(fit.lines, ["Moonlight"]);
  assert.equal(fit.cut, false);
});

test("a longer name uses two lines before it uses a smaller size, if two lines are allowed", () => {
  const one = fitLines("Fantasy on Themes from Carmen", { maxWidth: 400, maxLines: 1, sizes: [100, 80, 60, 40], measure });
  const two = fitLines("Fantasy on Themes from Carmen", { maxWidth: 400, maxLines: 2, sizes: [100, 80, 60, 40], measure });
  assert.ok(two.size >= one.size);
  assert.ok(two.lines.length <= 2);
  assert.ok(two.lines.every((l) => measure(l, two.size) <= 400));
});

test("when nothing fits, the text is cut with an ellipsis and stays inside", () => {
  const fit = fitLines("A very long name indeed that cannot possibly fit on two small lines at all, however small", { maxWidth: 200, maxLines: 2, sizes: [40, 30, 20], measure });
  assert.equal(fit.size, 20);
  assert.equal(fit.lines.length, 2);
  assert.equal(fit.cut, true);
  assert.ok(fit.lines[1].endsWith("…"));
  assert.ok(fit.lines.every((l) => measure(l, 20) <= 200));
  const unbroken = fitLines("W".repeat(80), { maxWidth: 200, maxLines: 1, sizes: [40, 20], measure });
  assert.ok(unbroken.lines[0].endsWith("…"));
  assert.ok(measure(unbroken.lines[0], 20) <= 200);
});

test("empty text gives one empty line, not a crash", () => {
  assert.deepEqual(fitLines("", { maxWidth: 100, maxLines: 2, sizes: [20, 10], measure }).lines, [""]);
});

test("a size that would break a word is passed over when a smaller one keeps every word whole", () => {
  const got = fitLines("Extraordinarily", { maxWidth: 400, maxLines: 2, sizes: [60, 50, 40], measure });
  assert.equal(got.size, 50, "at 60 the word is 450 wide and would be broken in two; at 50 it is 375 and stays whole");
  assert.deepEqual(got.lines, ["Extraordinarily"]);
});

test("a word too long at every size is still broken rather than dropped", () => {
  const got = fitLines("Extraordinarily", { maxWidth: 200, maxLines: 2, sizes: [40, 30, 20], measure });
  assert.equal(got.lines.join(""), "Extraordinarily");
  assert.equal(got.cut, false);
});
