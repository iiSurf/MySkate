import { readFileSync } from "node:fs";
import { buildCatalog } from "../js/catalog.js";

const dir = new URL("../data/catalog/", import.meta.url);

/* The real catalog, read from disk. */
export function realCatalog() {
  const index = JSON.parse(readFileSync(new URL("index.json", dir), "utf8"));
  const tracks = index.tracks.map((entry) => {
    const data = JSON.parse(readFileSync(new URL(entry.file, dir), "utf8"));
    return { id: data.id, name: data.name, kind: entry.kind, source: data.source, note: data.note, levels: data.levels };
  });
  const catalog = buildCatalog(tracks);
  catalog.freeTests = JSON.parse(readFileSync(new URL("freeskate-tests.json", dir), "utf8"));
  return catalog;
}

let n = 0;
export function session(date, { stars = {}, onIceSec = 3600, extra = [] } = {}) {
  n += 1;
  const entries = Object.entries(stars).map(([skillId, s]) => ({ skillId, stars: s, landed: 0, attempts: 0, note: "" }));
  return { id: "s" + n, date, startedAt: `${date}T10:00:00.000Z`, bookedMin: 60, onIceSec, entries: [...entries, ...extra], note: "" };
}

/* A storage that behaves like localStorage. */
export function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}
