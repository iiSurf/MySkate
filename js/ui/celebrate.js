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
    star.style.setProperty("--c", i % 2 ? "#ffd98a" : "#ffffff");
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
