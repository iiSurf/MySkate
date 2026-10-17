/* Ice tracks: the background draws the marks a skater leaves, one pattern per skill.
   A skill's name and category pick the pattern; the skill id picks where it lands,
   so the same skill always appears in the same place on your ice. */

const NS = "http://www.w3.org/2000/svg";
export const ICE = { width: 1600, height: 1000 };

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (x) => x.toFixed(1);
const line = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join("L");

function smooth(pts) {
  let d = "M" + f(pts[0][0]) + " " + f(pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function sine(len, amp, wave, phase = 0, steps = 90) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * len - len / 2;
    pts.push([x, amp * Math.sin(phase + (x / wave) * Math.PI * 2)]);
  }
  return line(pts);
}

function trochoid(loops, a, b, steps = 220) {
  const pts = [];
  const total = loops * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * total;
    pts.push([a * t - b * Math.sin(t) - (a * total) / 2, -b * Math.cos(t)]);
  }
  return line(pts);
}

function spiral(radius, turns, squash = 0.8) {
  const steps = Math.round(turns * 56);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * turns * Math.PI * 2;
    const r = 3 + (radius - 3) * Math.pow(t, 0.92);
    pts.push([r * Math.cos(ang), r * Math.sin(ang) * squash]);
  }
  return line(pts);
}

function ellipse(cx, cy, rx, ry) {
  return `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0`;
}

/* Which pattern a skill leaves behind. */
export function trackTypeFor(skill) {
  const name = skill.name.toLowerCase();
  if (skill.cat === "spins") return "spin";
  if (skill.cat === "jumps") {
    if (/hop|bunny/.test(name)) return "hop";
    if (/toe loop|flip|lutz/.test(name)) return "toeJump";
    return "edgeJump";
  }
  if (/stop/.test(name)) return "stop";
  if (/twizzle/.test(name)) return "twizzle";
  if (/swizzle|wiggle|slalom|chass|rocking/.test(name)) return "swizzle";
  if (/three-turn|bracket|rocker|\bcounters?\b|choctaw|pivot/.test(name)) return "turn";
  if (/mohawk/.test(name)) return "mohawk";
  if (/eight/.test(name)) return "eight";
  if (/circle|edge/.test(name)) return "circle";
  if (/crossover|stroking|pumps|pulls/.test(name)) return "scallop";
  if (/loop/.test(name)) return "loop";
  if (/spiral/.test(name)) return "spiral";
  if (/sequence|step|footwork|mazurka|waltz/.test(name)) return "steps";
  return "glide";
}

/* Local-coordinate shapes, centered near (0, 0). Each returns { paths, dots }. */
const shapes = {
  glide(r) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push([-300 + i * 120, (r() - 0.5) * 120]);
    return { paths: [smooth(pts)], dots: [] };
  },
  swizzle() {
    return { paths: [sine(440, 17, 72), sine(440, 17, 72, Math.PI)], dots: [] };
  },
  scallop() {
    const rad = 24;
    let d = `M${-9 * rad} 0`;
    for (let i = 0; i < 9; i++) d += `a${rad} ${rad} 0 0 ${i % 2 ? 0 : 1} ${rad * 2} 0`;
    return { paths: [d], dots: [] };
  },
  circle(r) {
    const rx = 96 + r() * 30;
    const ry = rx * 0.72;
    return { paths: [ellipse(0, 0, rx, ry), ellipse(5, 3, rx - 7, ry - 6)], dots: [] };
  },
  eight() {
    return { paths: [ellipse(-88, 0, 88, 64), ellipse(88, 0, 88, 64), ellipse(-84, 3, 82, 59)], dots: [] };
  },
  turn() {
    let d = "";
    for (let i = 0; i < 4; i++) {
      const x = -220 + i * 112;
      d += `M${x} 0C${x + 28} -24 ${x + 56} -24 ${x + 68} -2C${x + 76} 10 ${x + 68} 22 ${x + 56} 26C${x + 70} 34 ${x + 96} 30 ${x + 110} 8`;
    }
    return { paths: [d], dots: [] };
  },
  mohawk() {
    return { paths: ["M-170 34C-130 -22 -44 -28 0 2L10 9C52 38 128 42 170 -6", "M-120 40C-96 18 -64 8 -36 10"], dots: [] };
  },
  twizzle() {
    return { paths: [trochoid(4, 15, 28)], dots: [] };
  },
  loop() {
    return { paths: ["M-260 40C-180 30 -120 -10 -60 -40" + "C0 -70 40 -20 0 10C-40 40 -70 -10 -10 -26C60 -44 160 -20 260 30"], dots: [] };
  },
  spin(r) {
    const rad = 90 + r() * 40;
    return { paths: [spiral(rad, 5.2), ellipse(0, 0, rad * 0.5, rad * 0.4)], dots: [[0, 0]] };
  },
  edgeJump() {
    return {
      paths: ["M-340 70C-250 20 -130 -30 -10 -22", "M64 -16C130 -6 200 22 250 70", "M70 -10L96 -10M74 -2L102 -2"],
      dots: [],
    };
  },
  toeJump() {
    const dots = [];
    for (let i = 0; i < 6; i++) dots.push([-26 + i * 7, -23 + i * 1.6]);
    return {
      paths: ["M-340 70C-250 20 -130 -30 -30 -22", "M64 -16C130 -6 200 22 250 70", "M70 -10L96 -10M74 -2L102 -2"],
      dots,
    };
  },
  hop() {
    return { paths: ["M-170 34C-110 4 -50 -8 0 -4", "M40 -2C80 4 120 20 150 44"], dots: [[-6, -6], [2, -5]] };
  },
  stop() {
    const paths = ["M-200 8L90 -2"];
    for (let i = 0; i < 15; i++) {
      const a = (-0.9 + (i / 14) * 1.8) * 0.9;
      const len = 36 + (i % 4) * 14;
      paths.push(`M90 -2L${f(90 + len * Math.cos(a))} ${f(-2 + len * Math.sin(a))}`);
    }
    return { paths, dots: [] };
  },
  spiral() {
    return { paths: [smooth([[-340, 60], [-200, -30], [-30, -50], [150, -10], [300, 70], [380, 110]])], dots: [] };
  },
  steps() {
    return { paths: [sine(560, 40, 120, 0.4)], dots: [] };
  },
};

export function buildTrack(skill) {
  const type = trackTypeFor(skill);
  const r = rng(hash(skill.id));
  return { type, ...shapes[type](r) };
}

function el(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/* Where a skill's track lands: a jittered grid, so marks spread across the whole sheet. */
function place(skill, index, total) {
  const r = rng(hash(skill.id + "#place"));
  const cols = 8;
  const rows = 5;
  const slots = cols * rows;
  const slot = (hash(skill.id) + index * 7) % slots;
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  return {
    x: (col + 0.5) * (ICE.width / cols) + (r() - 0.5) * 120,
    y: (row + 0.5) * (ICE.height / rows) + (r() - 0.5) * 100,
    rot: (r() - 0.5) * 70,
    scale: 0.66 + r() * 0.42,
  };
}

/* One skill's marks as an SVG group. state: "learning" (cyan), "earned" (gold), or "stale" (faint). */
export function trackGroup(skill, index, total, state = "learning") {
  const shape = buildTrack(skill);
  const at = place(skill, index, total);
  const g = el("g", {
    class: "trk trk--" + state,
    transform: `translate(${f(at.x)} ${f(at.y)}) rotate(${f(at.rot)}) scale(${f(at.scale)})`,
    "data-skill": skill.id,
    "data-type": shape.type,
  });
  for (const d of shape.paths) {
    g.append(el("path", { class: "trk__glow", d, "vector-effect": "non-scaling-stroke" }));
  }
  for (const d of shape.paths) {
    g.append(el("path", { class: "trk__core", d, "vector-effect": "non-scaling-stroke" }));
  }
  for (const [x, y] of shape.dots) {
    g.append(el("circle", { class: "trk__dot", cx: f(x), cy: f(y), r: "2.4" }));
  }
  return g;
}

/* Redraw the whole sheet. skills: [{ id, name, cat, state }]. Returns the group for each skill id. */
export function drawIce(svg, skills) {
  svg.replaceChildren();
  const groups = new Map();
  skills.forEach((skill, i) => {
    const g = trackGroup(skill, i, skills.length, skill.state || "learning");
    svg.append(g);
    groups.set(skill.id, g);
  });
  return groups;
}

/* Carve one new track while you watch, with a glint at the blade. */
export function carveTrack(svg, skill, index, total, state = "learning", reduceMotion = false) {
  const g = trackGroup(skill, index, total, state);
  svg.append(g);
  if (reduceMotion) return Promise.resolve(g);

  const cores = [...g.querySelectorAll(".trk__core")];
  const glows = [...g.querySelectorAll(".trk__glow")];
  const dots = [...g.querySelectorAll(".trk__dot")];
  const longest = cores.reduce((a, b) => (b.getTotalLength() > a.getTotalLength() ? b : a), cores[0]);
  const length = longest.getTotalLength();
  [...cores, ...glows].forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len + " " + len;
    p.style.strokeDashoffset = String(len);
  });
  dots.forEach((d) => (d.style.opacity = "0"));

  const star = el("path", {
    class: "trk__star",
    d: "M0-9 2.4-2.4 9 0 2.4 2.4 0 9-2.4 2.4-9 0-2.4-2.4z",
    "vector-effect": "non-scaling-stroke",
  });
  g.append(star);

  const duration = 2600;
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 2.4);
      [...cores, ...glows].forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDashoffset = String(len * (1 - eased));
      });
      const pt = longest.getPointAtLength(length * eased);
      star.setAttribute("transform", `translate(${f(pt.x)} ${f(pt.y)}) scale(${1.2 + Math.sin(t * 18) * 0.4})`);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        star.remove();
        dots.forEach((d) => {
          d.style.opacity = "";
        });
        [...cores, ...glows].forEach((p) => {
          p.style.strokeDasharray = "";
          p.style.strokeDashoffset = "";
        });
        resolve(g);
      }
    }
    requestAnimationFrame(frame);
  });
}
