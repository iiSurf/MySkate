// Takes a screenshot of a page at an exact device size with a headless Chrome (no install needed beyond Chrome itself).
// usage: node tools/shot.mjs <out.png> <width> <height> <scale> <url> [fullPage=0] [wait ms] [js to run before shooting]
// example: node tools/shot.mjs home.png 390 844 2 "http://localhost:8000/tools/seed.html?s=full&r=home"
// Set CHROME to the browser's path if it is not the default macOS one. It is for checking screens, not part of the app.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const [out, W, H, SCALE, url, full = "0", wait = "1800", js = ""] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/myskate-shot-${port}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let targets;
  for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.find((t) => t.type === "page")) break; } catch {} await sleep(200); }
  const page = targets.find((t) => t.type === "page");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: +SCALE, mobile: +W < 700 });
  await send("Page.navigate", { url });
  await sleep(+wait);
  if (js) { const r = await send("Runtime.evaluate", { expression: js, awaitPromise: true, returnByValue: true }); await sleep(600); if (r.result?.result?.value !== undefined) console.log(JSON.stringify(r.result.result.value)); }
  let clip;
  if (full === "1") {
    const m = await send("Page.getLayoutMetrics");
    const h = Math.ceil(m.result.cssContentSize.height);
    await send("Emulation.setDeviceMetricsOverride", { width: +W, height: h, deviceScaleFactor: +SCALE, mobile: +W < 700 });
    await sleep(500);
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("saved", out);
} finally { try { ws?.close(); } catch {} chrome.kill(); }
