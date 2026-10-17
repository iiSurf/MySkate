/* Keep the screen on while a session is running, where the browser allows it. */

let lock = null;
let wanted = false;

async function acquire() {
  try {
    if (!("wakeLock" in navigator) || lock) return;
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => {
      lock = null;
    });
  } catch (err) {
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
