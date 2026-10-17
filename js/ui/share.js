/* Sharing a badge as a picture: drawn on a canvas, then handed to the phone's share sheet (or saved as a file when the
   device cannot share files). Nothing is uploaded: the picture is made on this device. */

import { fmtDate } from "../util.js";
import { toast } from "./dom.js";

const W = 1080;
const H = 1350;

function star(c, x, y, outer, inner) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}

/* Text broken into lines no wider than maxWidth. Returns the y of the line after the last one. */
function wrap(c, text, x, y, maxWidth, lineHeight) {
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const test = line ? line + " " + word : word;
    if (c.measureText(test).width > maxWidth && line) {
      c.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = test;
  }
  if (line) c.fillText(line, x, y);
  return y + lineHeight;
}

/* The picture for one earned badge, as a JPEG (a smooth picture, so it stays small enough to send in a message). */
export async function badgeImage(badge, name = "") {
  try {
    await Promise.all([document.fonts.load('italic 800 100px "Bodoni Moda"'), document.fonts.load('500 40px "Jost"')]);
  } catch (err) {
    /* the page falls back to a serif and sans-serif */
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");

  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#061641");
  bg.addColorStop(0.6, "#0b2a66");
  bg.addColorStop(1, "#14468e");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W / 2, 540, 40, W / 2, 540, 620);
  glow.addColorStop(0, "rgba(255, 200, 110, 0.5)");
  glow.addColorStop(1, "rgba(255, 200, 110, 0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  c.fillStyle = "rgba(255, 255, 255, 0.75)";
  for (const [x, y, r] of [[120, 160, 14], [940, 220, 18], [200, 760, 10], [900, 800, 12], [140, 1100, 12], [960, 1060, 16], [820, 120, 9]]) {
    star(c, x, y, r, r / 3.2);
    c.fill();
  }

  c.textAlign = "center";
  c.fillStyle = "#ffd98a";
  c.font = '500 34px "Jost", system-ui, sans-serif';
  if ("letterSpacing" in c) c.letterSpacing = "10px";
  c.fillText("NEW BADGE", W / 2, 150);
  if ("letterSpacing" in c) c.letterSpacing = "0px";

  const m = c.createRadialGradient(W / 2 - 80, 440, 20, W / 2, 540, 260);
  m.addColorStop(0, "#fff4c9");
  m.addColorStop(0.45, "#ffd98a");
  m.addColorStop(1, "#f5a742");
  c.fillStyle = m;
  c.beginPath();
  c.arc(W / 2, 540, 250, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 12;
  c.strokeStyle = "rgba(255, 244, 205, 0.95)";
  c.stroke();
  c.lineWidth = 6;
  c.strokeStyle = "rgba(120, 70, 0, 0.35)";
  c.beginPath();
  c.arc(W / 2, 540, 205, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "#4a2f00";
  star(c, W / 2, 545, 120, 48);
  c.fill();

  c.fillStyle = "#fff4cd";
  c.font = 'italic 800 104px "Bodoni Moda", Georgia, serif';
  const nameBottom = wrap(c, badge.name, W / 2, 930, W - 160, 112);
  c.fillStyle = "#dff3ff";
  c.font = '500 44px "Jost", system-ui, sans-serif';
  wrap(c, badge.text, W / 2, nameBottom + 6, W - 200, 58);

  const took = badge.sessionsTaken ? ` · ${badge.sessionsTaken} ${badge.sessionsTaken === 1 ? "session" : "sessions"}` : "";
  c.fillStyle = "rgba(223, 243, 255, 0.8)";
  c.font = '500 36px "Jost", system-ui, sans-serif';
  if (badge.earnedOn) c.fillText(`Earned ${fmtDate(badge.earnedOn, { month: "long", day: "numeric", year: "numeric" })}${took}`, W / 2, 1210);
  c.fillStyle = "#ffd98a";
  c.font = 'italic 800 64px "Bodoni Moda", Georgia, serif';
  c.fillText(name ? `${name} · MySkate` : "MySkate", W / 2, 1290);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no picture"))), "image/jpeg", 0.92));
}

/* Share the picture with the device's share sheet, or save it as a file. */
export async function shareBadge(badge, name = "") {
  let blob;
  try {
    blob = await badgeImage(badge, name);
  } catch (err) {
    toast("Could not make the picture on this device.");
    return;
  }
  const file = new File([blob], `myskate-${badge.id}.jpg`, { type: "image/jpeg" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `${badge.name} · MySkate`, text: `I earned the ${badge.name} badge on MySkate.` });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Picture saved. Look in your downloads.");
}
