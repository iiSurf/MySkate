import { drawIce, carveTrack, trackTypeFor } from "../js/ice-tracks.js";

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const ns = "http://www.w3.org/2000/svg";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function toast(message) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = el("div", "toast", message);
  t.setAttribute("role", "status");
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function pressOne(group, target) {
  group.querySelectorAll("button.chip").forEach((c) => c.setAttribute("aria-pressed", String(c === target)));
}

function twinkleBurst(target, count) {
  if (reduceMotion.matches) return;
  for (let i = 0; i < count; i++) {
    const star = el("span", "twinkle-star");
    const angle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 34;
    star.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    star.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    star.style.setProperty("--c", i % 2 ? "#ffd98a" : "#ffffff");
    target.appendChild(star);
    star.addEventListener("animationend", () => star.remove());
  }
}

/* Light of day: sunrise, golden hour, midday, dusk */
const lightBar = document.getElementById("light");
const lights = ["sunrise", "golden", "midday", "dusk"];

function setLight(name) {
  root.dataset.light = name;
  lightBar.querySelectorAll("button[data-light]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.light === name)));
  try {
    localStorage.setItem("myskate-light", name);
  } catch (err) {
    /* storage can be blocked; the picker still works for this visit */
  }
}

let savedLight = null;
try {
  savedLight = localStorage.getItem("myskate-light");
} catch (err) {
  savedLight = null;
}
setLight(lights.includes(savedLight) ? savedLight : "golden");
lightBar.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-light]");
  if (btn) setLight(btn.dataset.light);
});

/* High contrast text */
const contrastBtn = document.getElementById("contrast");
contrastBtn.addEventListener("click", () => {
  const on = contrastBtn.getAttribute("aria-pressed") !== "true";
  contrastBtn.setAttribute("aria-pressed", String(on));
  if (on) root.dataset.contrast = "high";
  else root.removeAttribute("data-contrast");
});

/* Ice slot chips: pick one */
const slots = document.getElementById("slots");
slots.addEventListener("click", (event) => {
  const chip = event.target.closest("button.chip");
  if (chip) pressOne(slots, chip);
});

/* Tab bars: a glass lens slides under the current tab */
function placeLens(bar, instant) {
  const current = bar.querySelector('.tab[aria-current="page"]');
  const lens = bar.querySelector(".lens");
  if (!current || !lens) return;
  if (instant) lens.style.transition = "none";
  lens.style.left = current.offsetLeft + "px";
  lens.style.width = current.offsetWidth + "px";
  if (instant) {
    void lens.offsetWidth;
    lens.style.transition = "";
  }
}

const tabbars = document.querySelectorAll(".tabbar");
tabbars.forEach((bar) => {
  placeLens(bar, true);
  bar.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    bar.querySelectorAll(".tab").forEach((t) => t.removeAttribute("aria-current"));
    tab.setAttribute("aria-current", "page");
    placeLens(bar, false);
  });
});
addEventListener("resize", () => tabbars.forEach((bar) => placeLens(bar, true)));
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => tabbars.forEach((bar) => placeLens(bar, true)));
}

/* XP demo. Level n to n+1 costs 100 + 50 * (n - 1), as in ROADMAP.md. */
const xpCard = document.getElementById("xp-card");
const xpAdd = document.getElementById("xp-add");
const xpNow = document.getElementById("xp-now");
const xpNeed = document.getElementById("xp-need");
const xpFill = document.getElementById("xp-fill");
const xpBar = document.getElementById("xp-bar");
const levelEl = document.getElementById("level");
let xp = 340;
let level = 7;

const needed = (lvl) => 100 + 50 * (lvl - 1);

function renderXp() {
  const pct = Math.round((xp / needed(level)) * 100);
  xpNow.textContent = String(xp);
  xpNeed.textContent = String(needed(level));
  xpFill.style.setProperty("--v", pct + "%");
  xpFill.style.setProperty("--vn", String(Math.max(pct, 1)));
  xpBar.setAttribute("aria-valuenow", String(pct));
  levelEl.firstChild.nodeValue = String(level);
}

function floatXp(label) {
  if (reduceMotion.matches) return;
  const card = xpCard.getBoundingClientRect();
  const btn = xpAdd.getBoundingClientRect();
  const tag = el("span", "xp-float", label);
  tag.style.left = btn.left - card.left + btn.width / 2 - 30 + "px";
  tag.style.top = btn.bottom - card.top + 4 + "px";
  xpCard.appendChild(tag);
  tag.addEventListener("animationend", () => tag.remove());
}

function popLevel() {
  if (reduceMotion.matches) return;
  levelEl.classList.remove("pop");
  void levelEl.offsetWidth;
  levelEl.classList.add("pop");
  levelEl.addEventListener("animationend", () => levelEl.classList.remove("pop"), { once: true });
}

function celebrate(newLevel) {
  const tapped = !navigator.userActivation || navigator.userActivation.hasBeenActive;
  if (navigator.vibrate && tapped && !reduceMotion.matches) navigator.vibrate([30, 40, 90]);

  const overlay = el("div", "cele");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Level " + newLevel + " reached");

  const burst = el("div", "cele__burst");
  const colors = ["#ffd98a", "#ffc35a", "#a6f1ff", "#ffffff", "#5fd8e6", "#ffb98a"];
  const reach = Math.min(innerWidth, 700) * 0.42;
  for (let i = 0; i < 58; i++) {
    const piece = el("i", i % 3 === 0 ? "star" : "");
    const angle = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * reach;
    piece.style.setProperty("--x", Math.cos(angle) * dist + "px");
    piece.style.setProperty("--y", Math.sin(angle) * dist * 0.8 - 40 + "px");
    piece.style.setProperty("--r", Math.random() * 720 - 360 + "deg");
    piece.style.setProperty("--c", colors[i % colors.length]);
    piece.style.setProperty("--s", 6 + Math.random() * 10 + "px");
    piece.style.setProperty("--t", 1.3 + Math.random() * 0.9 + "s");
    piece.style.setProperty("--dl", Math.random() * 0.25 + "s");
    burst.appendChild(piece);
  }

  const badge = el("div", "level level--xl", String(newLevel));
  const keep = el("button", "btn btn--gold", "Keep skating");
  keep.type = "button";

  overlay.append(
    el("div", "cele__rays"),
    burst,
    badge,
    el("h2", "cele__title", "Level up!"),
    el("p", "cele__sub", "You reached level " + newLevel + ". Every skate counted."),
    keep
  );
  document.body.appendChild(overlay);
  keep.focus();

  function close() {
    document.removeEventListener("keydown", onKey);
    const done = () => {
      overlay.remove();
      xpAdd.focus();
      popLevel();
    };
    if (reduceMotion.matches) {
      done();
      return;
    }
    overlay.classList.add("out");
    overlay.addEventListener("animationend", done, { once: true });
  }

  function onKey(event) {
    if (event.key === "Escape") close();
  }

  keep.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);
}

xpAdd.addEventListener("click", () => {
  xp += 20;
  floatXp("+20 XP");
  let leveled = false;
  if (xp >= needed(level)) {
    xp -= needed(level);
    level += 1;
    leveled = true;
  }
  renderXp();
  if (leveled) celebrate(level);
});

/* Skate rating demo: earned skates bounce in, with sparkles */
const labels = ["Just trying", "Rough", "Getting there", "Solid", "Consistent"];
const ratingEl = document.getElementById("rating");
const ratingLabel = document.getElementById("rating-label");

for (let i = 1; i <= 5; i++) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", i + (i === 1 ? " skate: " : " skates: ") + labels[i - 1]);
  btn.setAttribute("aria-pressed", "false");
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "skate");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "../assets/skate.svg#skate");
  svg.appendChild(use);
  btn.appendChild(svg);
  btn.addEventListener("click", () => {
    const buttons = [...ratingEl.querySelectorAll("button")];
    const before = buttons.filter((b) => b.getAttribute("aria-pressed") === "true").length;
    buttons.forEach((b, idx) => {
      const on = idx < i;
      b.setAttribute("aria-pressed", String(on));
      if (on && idx >= before && !reduceMotion.matches) {
        b.style.setProperty("--i", (idx - before) * 0.07 + "s");
        b.classList.remove("earn");
        void b.offsetWidth;
        b.classList.add("earn");
        b.addEventListener("animationend", () => b.classList.remove("earn"), { once: true });
      }
    });
    twinkleBurst(btn, i === 5 ? 16 : 7);
    ratingLabel.textContent = i + (i === 1 ? " skate: " : " skates: ") + labels[i - 1];
  });
  ratingEl.appendChild(btn);
}

/* Plan rows: tick done */
document.getElementById("rows").addEventListener("click", (event) => {
  const tick = event.target.closest(".tick");
  if (!tick) return;
  tick.setAttribute("aria-checked", String(tick.getAttribute("aria-checked") !== "true"));
});

/* Blade life: editable sharpening limit, hours on the blades, and a button to reset after a sharpening */
const bladeTile = document.getElementById("blade-tile");
const bladeArt = document.getElementById("blade-art");
const bladeState = document.getElementById("blade-state");
const bladePanel = document.getElementById("blade-panel");
const limitChips = document.getElementById("limit-chips");
const limitCustom = document.getElementById("limit-custom");
const hoursInput = document.getElementById("h-now");
const blade = { hours: 14, limit: 25 };

function fmt(h) {
  return String(Math.round(h * 100) / 100);
}

function renderBlade() {
  const pct = Math.max(0, Math.min(100, Math.round((blade.hours / blade.limit) * 100)));
  const left = blade.limit - blade.hours;
  document.getElementById("blade-hours").textContent = fmt(blade.hours);
  document.getElementById("blade-limit").textContent = fmt(blade.limit);
  bladeArt.style.setProperty("--p", pct + "%");
  const bar = document.getElementById("blade-bar");
  bar.style.setProperty("--v", pct + "%");
  bar.style.setProperty("--vn", String(Math.max(pct, 1)));
  if (pct < 60) {
    bladeState.className = "chip chip--on";
    bladeState.textContent = "Sharp";
  } else if (pct < 90) {
    bladeState.className = "chip chip--gold";
    bladeState.textContent = "Getting dull";
  } else {
    bladeState.className = "chip chip--coral";
    bladeState.textContent = "Time to sharpen";
  }
  const leftText =
    left > 0 ? fmt(left) + (left === 1 ? " hour left" : " hours left") : "Over by " + fmt(-left) + (-left === 1 ? " hour" : " hours");
  document.getElementById("blade-left").textContent = leftText;
  limitChips.querySelectorAll("button.chip").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.h) === blade.limit)));
  if (document.activeElement !== limitCustom) limitCustom.value = fmt(blade.limit);
  if (document.activeElement !== hoursInput) hoursInput.value = fmt(blade.hours);
}

document.getElementById("blade-edit").addEventListener("click", (event) => {
  const open = bladePanel.hidden;
  bladePanel.hidden = !open;
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

limitChips.addEventListener("click", (event) => {
  const chip = event.target.closest("button.chip");
  if (!chip) return;
  blade.limit = Number(chip.dataset.h);
  renderBlade();
});

limitCustom.addEventListener("input", () => {
  const n = Number(limitCustom.value);
  if (n >= 5 && n <= 100) {
    blade.limit = n;
    renderBlade();
  }
});

hoursInput.addEventListener("input", () => {
  const n = Number(hoursInput.value);
  if (hoursInput.value !== "" && n >= 0 && n <= 200) {
    blade.hours = n;
    renderBlade();
  }
});

document.getElementById("h-dec").addEventListener("click", () => {
  blade.hours = Math.max(0, blade.hours - 1);
  hoursInput.value = fmt(blade.hours);
  renderBlade();
});

document.getElementById("h-inc").addEventListener("click", () => {
  blade.hours = Math.min(200, blade.hours + 1);
  hoursInput.value = fmt(blade.hours);
  renderBlade();
});

document.getElementById("blade-log").addEventListener("click", () => {
  blade.hours = 0;
  hoursInput.value = "0";
  renderBlade();
  bladeArt.style.position = "relative";
  twinkleBurst(bladeArt, 14);
  toast("Sharpening logged. Blade life is back to full.");
});

renderBlade();

/* Your ice: tracks drawn by skill, from the real catalog */
const iceSvg = document.getElementById("ice");
const iceRange = document.getElementById("ice-n");
const iceOut = document.getElementById("ice-n-out");
const iceNow = document.getElementById("ice-now");
let catalogSkills = [];

const typeText = {
  glide: "a long glide",
  swizzle: "a weaving chain",
  scallop: "crossover scallops",
  circle: "edge circles",
  eight: "a figure eight",
  turn: "a row of tiny 3s",
  mohawk: "a mohawk step",
  twizzle: "cursive twizzle loops",
  loop: "a loop",
  spin: "a spin spiral",
  edgeJump: "a takeoff and a landing",
  toeJump: "toe-pick dots, then a landing",
  hop: "a small hop",
  stop: "a skid with a spray of snow",
  spiral: "a long sweeping spiral",
  steps: "a serpentine",
};

async function loadCatalog() {
  const skills = [];
  try {
    const index = await (await fetch("../data/catalog/index.json")).json();
    for (const track of index.tracks.filter((t) => t.id === "lts-basic" || t.id === "lts-freeskate")) {
      const data = await (await fetch("../data/catalog/" + track.file)).json();
      for (const level of data.levels) {
        for (const s of level.skills) skills.push({ id: s.id, name: s.name, cat: s.cat });
      }
    }
  } catch (err) {
    /* Fall back to a few made-up skills so the demo still draws */
    ["Forward swizzles", "Hockey stop", "Forward outside edge", "Waltz jump", "One-foot spin", "Forward crossovers"].forEach((name, i) =>
      skills.push({ id: "demo." + i, name, cat: /jump/i.test(name) ? "jumps" : /spin/i.test(name) ? "spins" : "skills" })
    );
  }
  return skills;
}

function stateFor(i, n) {
  if (i < n * 0.55) return "earned";
  if (i % 7 === 3) return "stale";
  return "learning";
}

function renderIce(n) {
  const shown = catalogSkills.slice(0, n).map((s, i) => ({ ...s, state: stateFor(i, n) }));
  drawIce(iceSvg, shown);
  iceOut.textContent = String(n);
}

loadCatalog().then((skills) => {
  catalogSkills = skills;
  iceRange.max = String(skills.length);
  const start = Math.min(38, skills.length);
  iceRange.value = String(start);
  renderIce(start);
});

iceRange.addEventListener("input", () => renderIce(Number(iceRange.value)));

document.getElementById("ice-carve").addEventListener("click", async (event) => {
  const n = Number(iceRange.value);
  if (n >= catalogSkills.length) {
    iceNow.textContent = "Every skill in this demo is already on your ice.";
    return;
  }
  const btn = event.currentTarget;
  btn.disabled = true;
  const skill = catalogSkills[n];
  iceNow.textContent = "Carving " + skill.name + ": " + typeText[trackTypeFor(skill)] + ".";
  await carveTrack(iceSvg, skill, n, n + 1, "learning", reduceMotion.matches);
  iceRange.value = String(n + 1);
  iceOut.textContent = String(n + 1);
  btn.disabled = false;
});

const peekBack = document.getElementById("peek-back");
document.getElementById("ice-peek").addEventListener("click", () => {
  root.classList.add("peek");
  peekBack.hidden = false;
  peekBack.focus();
});
peekBack.addEventListener("click", () => {
  root.classList.remove("peek");
  peekBack.hidden = true;
});

/* First run: set up skates and level, restore a backup, or connect from another device */
const onboard = document.getElementById("onboard");
const connect = document.getElementById("connect");
const obSteps = [...onboard.querySelectorAll("[data-step]")];
const obDots = [...document.querySelectorAll("#ob-dots i")];
const obBack = document.getElementById("ob-back");
const obNext = document.getElementById("ob-next");
const obStatus = document.getElementById("ob-status");
let obStep = 0;

function obShow(step) {
  obStep = step;
  obSteps.forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
  obDots.forEach((d, i) => d.classList.toggle("on", i === step));
  obBack.hidden = step === 0;
  obNext.hidden = step === 0;
  obNext.textContent = step === 4 ? "Start skating" : "Next";
  if (step === 4) {
    const limit = document.querySelector("#ob-limit button[aria-pressed='true']");
    const hours = limit ? limit.dataset.h : document.getElementById("ob-limit-custom").value;
    const slot = document.querySelector("#ob-slot button[aria-pressed='true']");
    const skills = document.getElementById("ob-skills");
    document.getElementById("ob-summary").textContent =
      "Sharpen after " + hours + " hours, " + (document.getElementById("ob-since").value || 0) + " hours so far. Working on " +
      skills.options[skills.selectedIndex].textContent + ". Usual slot: " + (slot ? slot.textContent : "60") + " minutes.";
  }
}

function fillLevels() {
  const skills = document.getElementById("ob-skills");
  const jumps = document.getElementById("ob-jumps");
  const groups = [
    ["Learn to Skate USA Basic", "lts-basic"],
    ["Learn to Skate USA Pre-Free Skate and Free Skate", "lts-freeskate"],
    ["Learn to Skate USA Adult", "lts-adult"],
    ["U.S. Figure Skating Skating Skills tests", "usfs-skating-skills"],
  ];
  fetch("../data/catalog/index.json")
    .then((r) => r.json())
    .then(async (index) => {
      for (const [label, id] of groups) {
        const track = index.tracks.find((t) => t.id === id);
        if (!track) continue;
        const data = await (await fetch("../data/catalog/" + track.file)).json();
        const group = document.createElement("optgroup");
        group.label = label;
        for (const level of data.levels) {
          const option = document.createElement("option");
          option.value = id + "/" + level.id;
          option.textContent = level.name.replace(/ Skating Skills$/, "");
          group.appendChild(option);
        }
        skills.appendChild(group);
        if (id === "lts-freeskate" || id === "lts-basic") jumps.appendChild(group.cloneNode(true));
      }
      const lib = document.createElement("optgroup");
      lib.label = "Beyond the levels";
      const opt = document.createElement("option");
      opt.value = "library";
      opt.textContent = "Jump and spin library (doubles, triples, Axels)";
      lib.appendChild(opt);
      jumps.appendChild(lib);
      skills.value = "lts-freeskate/pre-free-skate";
      jumps.value = "lts-freeskate/pre-free-skate";
    })
    .catch(() => {
      skills.innerHTML = "<option>Pre-Free Skate</option>";
      jumps.innerHTML = "<option>Pre-Free Skate</option>";
    });
}
fillLevels();

function summarizeBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { ok: false, msg: "That file is not readable. Pick a MySkate backup (.json)." };
  }
  if (!data || typeof data !== "object" || !("schemaVersion" in data) || !Array.isArray(data.sessions)) {
    return { ok: false, msg: "That file does not look like a MySkate backup." };
  }
  const n = data.sessions.length;
  const dates = data.sessions.map((s) => s.date).filter(Boolean).sort();
  const range = dates.length ? ", " + dates[0] + " to " + dates[dates.length - 1] : "";
  return { ok: true, msg: "Found " + n + (n === 1 ? " session" : " sessions") + range + ". The real app asks Merge or Replace next." };
}

function showBackup(text) {
  const result = summarizeBackup(text);
  obStatus.className = "status " + (result.ok ? "status--ok" : "status--warn");
  obStatus.textContent = result.msg;
}

document.getElementById("open-onboard").addEventListener("click", () => {
  obStatus.textContent = "";
  obStatus.className = "status";
  obShow(0);
  onboard.showModal();
});
document.getElementById("ob-close").addEventListener("click", () => onboard.close());
obBack.addEventListener("click", () => obShow(Math.max(0, obStep - 1)));
obNext.addEventListener("click", () => {
  if (obStep === 4) {
    onboard.close();
    toast("Setup saved in this preview. Nothing was stored.");
  } else {
    obShow(obStep + 1);
  }
});
onboard.querySelector("[data-go='1']").addEventListener("click", () => obShow(1));

document.getElementById("ob-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  showBackup(await file.text());
  event.target.value = "";
});

document.getElementById("ob-sample").addEventListener("click", () => {
  const sessions = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(2026, 9, 1 + i);
    sessions.push({ id: "s" + i, date: d.toISOString().slice(0, 10), bookedMin: 60, onIceSec: 3300, entries: [] });
  }
  showBackup(JSON.stringify({ schemaVersion: 1, sessions }));
});

document.getElementById("ob-connect").addEventListener("click", () => {
  onboard.close();
  openConnect();
});

function chipGroup(id, onChange) {
  const group = document.getElementById(id);
  group.addEventListener("click", (event) => {
    const chip = event.target.closest("button.chip");
    if (!chip) return;
    pressOne(group, chip);
    if (onChange) onChange(chip);
  });
}
chipGroup("ob-limit", (chip) => (document.getElementById("ob-limit-custom").value = chip.dataset.h));
chipGroup("ob-slot");
document.getElementById("ob-limit-custom").addEventListener("input", (event) => {
  const n = event.target.value;
  document.querySelectorAll("#ob-limit button.chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.h === n)));
});

/* Connect devices: a sample code, since the real encoder comes later */
const cnMode = document.getElementById("cn-mode");
const cnDir = document.getElementById("cn-dir");
let cnState = { mode: "show", dir: "c2p" };

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleQr(seed) {
  const N = 29;
  const r = mulberry(seed);
  const on = Array.from({ length: N }, () => Array(N).fill(false));
  const reserved = (x, y) => (x < 9 && y < 9) || (x > N - 9 && y < 9) || (x < 9 && y > N - 9);
  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        on[oy + y][ox + x] = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      }
    }
  };
  finder(0, 0);
  finder(N - 7, 0);
  finder(0, N - 7);
  for (let i = 8; i < N - 8; i++) {
    on[6][i] = i % 2 === 0;
    on[i][6] = i % 2 === 0;
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!reserved(x, y) && x !== 6 && y !== 6) on[y][x] = r() > 0.52;
    }
  }
  let d = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) if (on[y][x]) d += `M${x} ${y}h1v1h-1z`;
  }
  return `<svg viewBox="-1 -1 ${N + 2} ${N + 2}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}" fill="#052545"/></svg>`;
}

const cnText = {
  "show,c2p": "Hold this up to your phone. On the phone, open MySkate, tap Connect, then Scan a code. This sample code is not real.",
  "show,p2c": "Show this to your computer's webcam. On the computer, open MySkate, tap Connect, then Scan a code. This sample code is not real.",
  "scan,c2p": "Point your phone's camera at the code on your computer screen.",
  "scan,p2c": "Point your computer's webcam at the code on your phone.",
};

function renderConnect() {
  document.getElementById("cn-show").hidden = cnState.mode !== "show";
  document.getElementById("cn-scan").hidden = cnState.mode !== "scan";
  document.getElementById("cn-text").textContent = cnText[cnState.mode + "," + cnState.dir];
  document.getElementById("cn-qr").innerHTML = sampleQr(cnState.dir === "c2p" ? 11 : 29);
  cnMode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === cnState.mode)));
  cnDir.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dir === cnState.dir)));
}

function openConnect() {
  renderConnect();
  connect.showModal();
}

cnMode.addEventListener("click", (event) => {
  const b = event.target.closest("button[data-mode]");
  if (!b) return;
  cnState.mode = b.dataset.mode;
  renderConnect();
});
cnDir.addEventListener("click", (event) => {
  const b = event.target.closest("button[data-dir]");
  if (!b) return;
  cnState.dir = b.dataset.dir;
  renderConnect();
});
document.getElementById("open-connect").addEventListener("click", openConnect);
document.getElementById("cn-close").addEventListener("click", () => connect.close());
