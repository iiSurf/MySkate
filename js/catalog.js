/* The skill catalog: loading it, indexing it, and walking from one level to the next. */

export async function loadCatalog(base = "data/catalog/", fetchFn = (...args) => fetch(...args)) {
  const index = await (await fetchFn(base + "index.json")).json();
  const tracks = [];
  for (const entry of index.tracks) {
    const data = await (await fetchFn(base + entry.file)).json();
    tracks.push({ id: data.id, name: data.name, kind: entry.kind, source: data.source, note: data.note, levels: data.levels });
  }
  return buildCatalog(tracks);
}

export function buildCatalog(tracks) {
  const skills = new Map();
  const levels = new Map();
  tracks.forEach((track) => {
    track.levels.forEach((level, li) => {
      const key = `${track.id}/${level.id}`;
      levels.set(key, {
        key,
        trackId: track.id,
        trackName: track.name,
        id: level.id,
        name: level.name,
        order: li,
        skillIds: level.skills.map((s) => s.id),
      });
      level.skills.forEach((s, si) => {
        skills.set(s.id, { ...s, trackId: track.id, trackName: track.name, levelKey: key, levelName: level.name, order: si });
      });
    });
  });
  const catalog = { tracks, skills, levels };
  catalog.chains = buildChains(catalog);
  return catalog;
}

/* Paths a skater walks, in order. Learn to Skate USA basics lead into Pre-Free Skate, adults too. */
function buildChains(catalog) {
  const keysOf = (trackId, filter = () => true) =>
    [...catalog.levels.values()].filter((l) => l.trackId === trackId && filter(l)).map((l) => l.key);
  return [
    [...keysOf("lts-basic"), ...keysOf("lts-freeskate")],
    [...keysOf("lts-adult"), ...keysOf("lts-freeskate")],
    keysOf("usfs-skating-skills", (l) => !l.id.startsWith("adult-")),
    keysOf("usfs-skating-skills", (l) => l.id.startsWith("adult-")),
    keysOf("library"),
  ].filter((chain) => chain.length);
}

export function nextLevelKey(catalog, key) {
  for (const chain of catalog.chains) {
    const i = chain.indexOf(key);
    if (i !== -1 && i < chain.length - 1) return chain[i + 1];
  }
  return null;
}

/* Skills a level asks for, leaving out bonus items unless asked. */
export function levelSkillIds(catalog, key, { bonus = false } = {}) {
  const level = catalog.levels.get(key);
  if (!level) return [];
  return level.skillIds.filter((id) => bonus || !catalog.skills.get(id).bonus);
}

export function skillTitle(catalog, id) {
  const s = catalog.skills.get(id);
  return s ? s.name : "Unknown skill";
}

export function levelLabel(catalog, key) {
  const level = catalog.levels.get(key);
  if (!level) return key === "library" ? "Jump and spin library" : "";
  return level.name.replace(/ Skating Skills$/, "");
}
