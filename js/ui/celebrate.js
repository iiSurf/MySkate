/* Rewards: sparkles, a floating "+XP", and the full-screen level-up. Everything stills down for reduced motion. */

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function twinkle(target, count = 8) {
  if (reducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const star = el("span", "twinkle-star");
    const angle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 34;
    star.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    star.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    star.style.setProperty("--c", i % 2 ? "#f4c04e" : "#2a7fc1");
    target.appendChild(star);
    star.addEventListener("animationend", () => star.remove());
  }
}

/* A "+20 XP" that rises from an element. The container must be position: relative. */
export function floatText(container, anchor, label) {
  if (reducedMotion()) return;
  const box = container.getBoundingClientRect();
  const at = anchor.getBoundingClientRect();
  const tag = el("span", "xp-float", label);
  tag.style.left = at.left - box.left + at.width / 2 - 30 + "px";
  tag.style.top = at.bottom - box.top + 4 + "px";
  container.appendChild(tag);
  tag.addEventListener("animationend", () => tag.remove());
}

/* The confetti and stars that fly out of the middle of a full-screen reward. */
function makeBurst() {
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
  return burst;
}

/* The level-up takeover. Resolves when the skater taps Keep skating (or presses Escape). */
export function levelUp(newLevel, { title = "Level up!", message } = {}) {
  const tapped = !navigator.userActivation || navigator.userActivation.hasBeenActive;
  if (navigator.vibrate && tapped && !reducedMotion()) navigator.vibrate([30, 40, 90]);

  const overlay = el("div", "cele");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `Level ${newLevel} reached`);

  const burst = makeBurst();

  const keep = el("button", "btn btn--gold", "Keep skating");
  keep.type = "button";
  overlay.append(
    el("div", "cele__rays"),
    burst,
    el("div", "level level--xl", String(newLevel)),
    el("h2", "cele__title", title),
    el("p", "cele__sub", message || `You reached level ${newLevel}. Every skate counted.`),
    keep
  );
  document.body.appendChild(overlay);
  keep.focus();

  return new Promise((resolve) => {
    function close() {
      document.removeEventListener("keydown", onKey);
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        overlay.remove();
        resolve();
      };
      if (reducedMotion()) return done();
      overlay.classList.add("out");
      overlay.addEventListener("animationend", done, { once: true });
      setTimeout(done, 500); // the screen must never stay covered if the browser does not report the fade finishing
    }
    function onKey(event) {
      if (event.key === "Escape") close();
    }
    keep.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);
  });
}

/* The new-badge takeover: the first badge big, the rest listed. onShare(badge) is called when the skater taps Share.
   Resolves when it is closed. */
export function badgeUnlock(badges, { onShare } = {}) {
  const first = badges[0];
  const tapped = !navigator.userActivation || navigator.userActivation.hasBeenActive;
  if (navigator.vibrate && tapped && !reducedMotion()) navigator.vibrate([30, 40, 90]);

  const overlay = el("div", "cele");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", badges.length === 1 ? `New badge: ${first.name}` : `${badges.length} new badges`);

  const medal = el("div", "medal medal--xl medal--pop");
  medal.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-${first.icon}"/></svg>`;
  const rest = badges.slice(1);
  const buttons = el("div", "cluster");
  const keep = el("button", "btn btn--gold", "Nice!");
  keep.type = "button";
  if (onShare) {
    const share = el("button", "btn btn--glass", "Share");
    share.type = "button";
    share.addEventListener("click", () => onShare(first));
    buttons.append(share);
  }
  buttons.append(keep);
  overlay.append(
    el("div", "cele__rays"),
    makeBurst(),
    medal,
    el("h2", "cele__title", badges.length === 1 ? "New badge!" : `${badges.length} new badges!`),
    el("p", "cele__sub", `${first.name}. ${first.text}`),
    ...(rest.length ? [el("p", "cele__sub", `Also: ${rest.map((b) => b.name).join(", ")}`)] : []),
    buttons
  );
  document.body.appendChild(overlay);
  keep.focus();

  return new Promise((resolve) => {
    function close() {
      document.removeEventListener("keydown", onKey);
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        overlay.remove();
        resolve();
      };
      if (reducedMotion()) return done();
      overlay.classList.add("out");
      overlay.addEventListener("animationend", done, { once: true });
      setTimeout(done, 500); // the screen must never stay covered if the browser does not report the fade finishing
    }
    function onKey(event) {
      if (event.key === "Escape") close();
    }
    keep.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
  });
}

/* Quick skating cheers for finishing something: a short scene, a title, and a line, then it goes by itself (or at a tap). They are
   lighter than the level-up: no button to press, about two and a half seconds. Each moment has its own scene:
     spin     a skater in a scratch spin over a traced circle (a session saved)
     eight    the week's figure eight traced whole (the week counts toward the streak)
     skate    the gold skate, popping (a skill earned)
     goal     a gold medal on a ribbon (a goal reached)
     flowers  flowers thrown onto the ice (a competition result)
     blade    a blade with a gleam running along it (fresh edges)
     check    a check drawn on the ice (homework or off-ice work done)
   With reduced motion the scene is still, and it still goes by itself. Resolves when it has gone. */
const SPARKS = [[30, 30, 7], [208, 26, 9], [22, 118, 6], [216, 112, 7], [120, 12, 5]];
const sparkle = () => SPARKS.map(([x, y, s], i) => `<g transform="translate(${x} ${y})"><path class="ch-spark" style="--d:${(i * 0.18).toFixed(2)}s;--s:${s}" d="M0-1C.12-.28.28-.12 1 0C.28.12.12.28 0 1C-.12.28-.28.12-1 0C-.28-.12-.12-.28 0-1Z"/></g>`).join("");

const SCENES = {
  spin: () => `<ellipse class="ch-ice" cx="120" cy="132" rx="92" ry="16"/><ellipse class="ch-trace" cx="120" cy="132" rx="70" ry="11" pathLength="100"/>
    <g class="ch-spinner"><circle cx="120" cy="38" r="10" class="ch-ink"/><path class="ch-body" d="M120 50 L120 96 M120 58 L104 30 M120 58 L136 30 M120 96 L112 128 M120 96 L128 128"/></g>
    <path class="ch-swirl" d="M84 72 Q120 58 156 72" pathLength="100"/><path class="ch-swirl ch-swirl--2" d="M90 92 Q120 104 150 92" pathLength="100"/>`,
  eight: () => `<path class="ch-eight-guide" d="M120 80A30 30 0 1 0 60 80A30 30 0 1 0 120 80A30 30 0 1 1 180 80A30 30 0 1 1 120 80"/>
    <path class="ch-eight" d="M120 80A30 30 0 1 0 60 80A30 30 0 1 0 120 80A30 30 0 1 1 180 80A30 30 0 1 1 120 80" pathLength="100"/>`,
  skate: () => `<g class="ch-pop"><use href="assets/skate.svg#skate" x="70" y="30" width="100" height="100"/></g>`,
  goal: () => `<path class="ch-ribbon" d="M104 18 L120 62 L136 18"/><g class="ch-pop"><circle class="ch-medal" cx="120" cy="92" r="34"/><circle class="ch-medal-ring" cx="120" cy="92" r="25"/><path class="ch-star" d="m120 74 5.3 10.9 12 1.7-8.7 8.4 2 11.9L120 101.3l-10.7 5.6 2-11.9-8.6-8.4 12-1.7z"/></g>`,
  flowers: () => `<line class="ch-ice-line" x1="20" y1="138" x2="220" y2="138"/>${[0, 1, 2, 3, 4].map((i) => `<g class="ch-flower" style="--i:${i};--x:${[-70, -34, 0, 36, 72][i]}px;--r:${[-30, 20, -10, 35, -20][i]}deg"><path class="ch-stem" d="M120 70 L120 100"/><circle class="ch-bloom" cx="120" cy="64" r="9"/><circle class="ch-bloom-in" cx="120" cy="64" r="4"/></g>`).join("")}`,
  blade: () => `<g class="ch-pop"><use href="assets/skate.svg#blade" x="20" y="62" width="200" height="36"/></g><rect class="ch-gleam" x="-40" y="56" width="28" height="48" rx="6"/>`,
  check: () => `<ellipse class="ch-ice" cx="120" cy="128" rx="86" ry="15"/><path class="ch-check" d="M76 82 L106 110 L166 46" pathLength="100"/>`,
};

export function cheer({ scene = "spin", title, line = "" } = {}) {
  const overlay = el("div", "cheer");
  overlay.setAttribute("aria-hidden", "true");
  const card = el("div", "cheer__card");
  card.innerHTML = `<svg class="cheer__scene cheer__scene--${scene}" viewBox="0 0 240 160" aria-hidden="true" focusable="false">${(SCENES[scene] || SCENES.spin)()}${sparkle()}</svg>`;
  card.append(el("p", "cheer__title", title), ...(line ? [el("p", "cheer__line", line)] : []));
  overlay.append(card);
  document.body.appendChild(overlay);
  /* Screen readers hear it through a live region that is already on the page (one that arrives with its text is often not read). */
  let live = document.getElementById("cheer-live");
  if (!live) {
    live = el("p", "sr-only");
    live.id = "cheer-live";
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);
  }
  live.textContent = "";
  setTimeout(() => (live.textContent = line ? `${title} ${line}` : title), 60);
  const tapped = !navigator.userActivation || navigator.userActivation.hasBeenActive;
  if (navigator.vibrate && tapped && !reducedMotion()) navigator.vibrate(40);
  return new Promise((resolve) => {
    let gone = false;
    const done = () => {
      if (gone) return;
      gone = true;
      clearTimeout(timer);
      overlay.classList.add("out");
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, reducedMotion() ? 0 : 260);
    };
    const timer = setTimeout(done, 2600);
    overlay.addEventListener("click", done);
  });
}
