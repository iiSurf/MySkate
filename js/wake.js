/* Keep the screen on while a session is running, where the browser allows it. */

let lock = null;
let wanted = false;
let pending = false;

async function acquire() {
  try {
    if (!("wakeLock" in navigator) || lock || pending) return;
    pending = true;
    const got = await navigator.wakeLock.request("screen");
    pending = false;
    /* The session may have ended while the browser was deciding: let go at once rather than keep the screen on. */
    if (!wanted) {
      got.release().catch(() => {});
      return;
    }
    lock = got;
    got.addEventListener("release", () => {
      if (lock === got) lock = null;
    });
  } catch (err) {
    pending = false;
    lock = null;
  }
}

export function keepAwake(on) {
  wanted = on;
  if (on) {
    acquire();
  } else if (lock) {
    lock.release().catch(() => {});
    lock = null;
  }
}

/* The browser drops the lock when the tab is hidden, so ask again when it comes back. */
document.addEventListener("visibilitychange", () => {
  if (wanted && document.visibilityState === "visible") acquire();
});
