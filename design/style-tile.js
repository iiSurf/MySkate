const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

/* Theme: night rink or daylight rink */
const themeBtn = document.getElementById("theme");

function setTheme(theme) {
  root.dataset.theme = theme;
  themeBtn.textContent = theme === "day" ? "Night rink" : "Daylight rink";
  themeBtn.setAttribute("aria-pressed", String(theme === "day"));
  try {
    localStorage.setItem("myskate-tile-theme", theme);
  } catch (err) {
    /* storage can be blocked; the toggle still works for this visit */
  }
}

let savedTheme = null;
try {
  savedTheme = localStorage.getItem("myskate-tile-theme");
} catch (err) {
  savedTheme = null;
}
setTheme(savedTheme === "day" ? "day" : "night");
themeBtn.addEventListener("click", () => setTheme(root.dataset.theme === "day" ? "night" : "day"));

/* Ice slot chips: pick one */
const slots = document.getElementById("slots");
slots.addEventListener("click", (event) => {
  const chip = event.target.closest("button.chip");
  if (!chip) return;
  slots.querySelectorAll("button.chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
});

/* XP demo. Level n to n+1 costs 100 + 50 * (n - 1), as in ROADMAP.md. */
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
  xpBar.setAttribute("aria-valuenow", String(pct));
  levelEl.firstChild.nodeValue = String(level);
}

function celebrate() {
  if (reduceMotion.matches) return;
  levelEl.classList.remove("pop");
  void levelEl.offsetWidth;
  levelEl.classList.add("pop");
  for (let i = 0; i < 12; i++) {
    const spark = document.createElement("i");
    spark.className = "spark";
    const angle = (i / 12) * Math.PI * 2;
    const dist = 46 + Math.random() * 22;
    spark.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    spark.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    levelEl.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

document.getElementById("xp-add").addEventListener("click", () => {
  xp += 20;
  if (xp >= needed(level)) {
    xp -= needed(level);
    level += 1;
    celebrate();
  }
  renderXp();
});

/* Skate rating demo */
const labels = ["Just trying", "Rough", "Getting there", "Solid", "Consistent"];
const ratingEl = document.getElementById("rating");
const ratingLabel = document.getElementById("rating-label");
const ns = "http://www.w3.org/2000/svg";

for (let i = 1; i <= 5; i++) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", i + (i === 1 ? " skate: " : " skates: ") + labels[i - 1]);
  btn.setAttribute("aria-pressed", "false");
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "ic");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "#i-skate");
  svg.appendChild(use);
  btn.appendChild(svg);
  btn.addEventListener("click", () => {
    ratingEl.querySelectorAll("button").forEach((b, idx) => b.setAttribute("aria-pressed", String(idx < i)));
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
