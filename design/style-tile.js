const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const ns = "http://www.w3.org/2000/svg";

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

/* Ice slot chips: pick one */
const slots = document.getElementById("slots");
slots.addEventListener("click", (event) => {
  const chip = event.target.closest("button.chip");
  if (!chip) return;
  slots.querySelectorAll("button.chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
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
  const tag = document.createElement("span");
  tag.className = "xp-float";
  tag.textContent = label;
  tag.style.left = btn.left - card.left + btn.width / 2 - 28 + "px";
  tag.style.top = btn.top - card.top - 10 + "px";
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

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function celebrate(newLevel) {
  if (navigator.vibrate && !reduceMotion.matches) navigator.vibrate([30, 40, 90]);

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

function twinkleBurst(target, count) {
  if (reduceMotion.matches) return;
  for (let i = 0; i < count; i++) {
    const star = el("span", "twinkle-star");
    const angle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 30;
    star.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    star.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    star.style.setProperty("--c", i % 2 ? "#ffd98a" : "#ffffff");
    target.appendChild(star);
    star.addEventListener("animationend", () => star.remove());
  }
}

for (let i = 1; i <= 5; i++) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", i + (i === 1 ? " skate: " : " skates: ") + labels[i - 1]);
  btn.setAttribute("aria-pressed", "false");
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "skate");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "#i-skate-art");
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
