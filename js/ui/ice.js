/* The ice behind everything. Keeps the drawn tracks in step with the skater's skills:
   new skills are carved live, and a track's color changes as the skill goes from learning to earned to stale. */

import { carveTrack, trackGroup } from "../ice-tracks.js";

export function createIce(svg, prefersReducedMotion = () => false) {
  const drawn = new Map();

  function sync(skills, { animate = false } = {}) {
    const wanted = new Set(skills.map((s) => s.id));
    for (const [id, rec] of drawn) {
      if (!wanted.has(id)) {
        rec.g.remove();
        drawn.delete(id);
      }
    }
    for (const skill of skills) {
      const rec = drawn.get(skill.id);
      if (rec) {
        if (rec.state !== skill.state) {
          rec.g.setAttribute("class", `trk trk--${skill.state}`);
          rec.state = skill.state;
        }
        continue;
      }
      if (animate && !prefersReducedMotion()) {
        carveTrack(svg, skill, skill.state, false);
        drawn.set(skill.id, { g: svg.lastElementChild, state: skill.state });
      } else {
        const g = trackGroup(skill, skill.state);
        svg.append(g);
        drawn.set(skill.id, { g, state: skill.state });
      }
    }
  }

  return { sync, count: () => drawn.size };
}
