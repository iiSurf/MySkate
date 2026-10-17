import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("css/fonts.css");
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);

test("the typefaces are served from this site, and no page asks Google for them", () => {
  for (const page of ["index.html", "design/style-tile.html", "css/tokens.css", "css/base.css", "css/components.css", "css/app.css", "css/fonts.css"]) {
    assert.ok(!/googleapis|gstatic/.test(read(page)), `${page} still points at Google's font servers`);
  }
  assert.match(read("index.html"), /href="css\/fonts\.css"/);
  assert.match(read("design/style-tile.html"), /href="\.\.\/css\/fonts\.css"/);
});

test("every font rule points at a real woff2 file and names one of the two families", () => {
  assert.equal(faces.length, 6);
  const files = [];
  for (const f of faces) {
    const family = /font-family:\s*"([^"]+)"/.exec(f)[1];
    assert.ok(["Bodoni Moda", "Jost"].includes(family), family);
    const file = /url\("\.\.\/(fonts\/[^"]+\.woff2)"\)/.exec(f)[1];
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} is missing`);
    assert.match(f, /font-display:\s*swap/);
    assert.match(f, /unicode-range:\s*U\+/);
    assert.match(f, /font-weight:\s*\d{3} \d{3}/, "a variable font names its weight range");
    files.push(file);
  }
  assert.equal(new Set(files).size, 6);
});

test("the font files are genuine woff2 files, and nothing else is in the folder but the README", () => {
  const dir = new URL("../fonts/", import.meta.url);
  const names = readdirSync(dir).sort();
  assert.deepEqual(names.filter((n) => n.endsWith(".woff2")).length, 6);
  assert.deepEqual(names.filter((n) => !n.endsWith(".woff2")), ["README.md"]);
  let total = 0;
  for (const n of names.filter((x) => x.endsWith(".woff2"))) {
    const bytes = readFileSync(new URL(n, dir));
    assert.equal(bytes.subarray(0, 4).toString("latin1"), "wOF2", `${n} is not a woff2 file`);
    assert.ok(bytes.length > 10_000 && bytes.length < 80_000, `${n}: ${bytes.length} bytes`);
    total += statSync(new URL(n, dir)).size;
  }
  assert.ok(total < 250_000, `the fonts weigh ${total} bytes`);
});

test("the fonts folder says where the files came from and how they are licensed", () => {
  const readme = read("fonts/README.md");
  assert.match(readme, /SIL Open Font License/);
  assert.match(readme, /Bodoni Moda/);
  assert.match(readme, /Jost/);
  assert.match(readme, /Copyright 2020 The Bodoni Moda Project Authors/);
});
