/* Planning a session: splitting the booked ice slot across the chosen skills. */

export const SLOTS = [30, 45, 60, 75, 90, 120];

/* Minutes for each skill, in steps of 5. Any left over go to the first skills, a step at a time. */
export function splitMinutes(slotMin, count) {
  if (count <= 0) return [];
  const step = 5;
  const units = Math.floor(slotMin / step);
  const base = Math.max(1, Math.floor(units / count));
  const out = Array(count).fill(base * step);
  let left = units - base * count;
  for (let i = 0; left > 0 && i < count; i = (i + 1) % count) {
    out[i] += step;
    left -= 1;
  }
  return out;
}

/* Move one item up or down in the plan. */
export function move(list, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
