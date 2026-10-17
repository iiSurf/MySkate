/* Sharing: a badge or a friend card as a picture (drawn on a canvas on this device, then handed to the phone's share sheet, or
   saved as a file when the device cannot share files), and a friend card as a link. Nothing is uploaded. */

import { fmtDate, html } from "../util.js";
import { cardLink } from "../friends.js";
import { lookById } from "../looks.js";
import { toast, openSheet, $ } from "./dom.js";

const W = 1080;
const H = 1350;

export const appBase = () => location.origin + location.pathname;

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

async function loadFonts() {
  try {
    await Promise.all([document.fonts.load('italic 800 100px "Bodoni Moda"'), document.fonts.load('500 40px "Jost"')]);
  } catch (err) {
    /* the page falls back to a serif and sans-serif */
  }
}

/* The night-ice background, with a warm glow where the medal goes and a few snow stars. */
function scene(c, label, look = null) {
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
  if (look) {
    /* a wash of the skater's own color rising from the bottom of the picture */
    const tint = c.createLinearGradient(0, H * 0.45, 0, H);
    tint.addColorStop(0, "rgba(0, 0, 0, 0)");
    tint.addColorStop(1, `${look.to}`);
    c.globalAlpha = 0.45;
    c.fillStyle = tint;
    c.fillRect(0, H * 0.45, W, H * 0.55);
    c.globalAlpha = 1;
  }
  c.fillStyle = "rgba(255, 255, 255, 0.75)";
  for (const [x, y, r] of [[120, 160, 14], [940, 220, 18], [200, 760, 10], [900, 800, 12], [140, 1100, 12], [960, 1060, 16], [820, 120, 9]]) {
    star(c, x, y, r, r / 3.2);
    c.fill();
  }
  c.textAlign = "center";
  c.fillStyle = "#ffd98a";
  c.font = '500 34px "Jost", system-ui, sans-serif';
  if ("letterSpacing" in c) c.letterSpacing = "10px";
  c.fillText(label, W / 2, 150);
  if ("letterSpacing" in c) c.letterSpacing = "0px";
}

/* A gold disc with a ring, and either a star or text (a level number) in the middle. */
function medal(c, middle) {
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
  if (middle === null) {
    star(c, W / 2, 545, 120, 48);
    c.fill();
  } else {
    c.font = 'italic 800 230px "Bodoni Moda", Georgia, serif';
    c.fillText(String(middle), W / 2, 625);
  }
}

const toBlob = (canvas) => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no picture"))), "image/jpeg", 0.92));

function makeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  return [canvas, canvas.getContext("2d")];
}

/* The picture for one earned badge, as a JPEG (a smooth picture, so it stays small enough to send in a message). */
export async function badgeImage(badge, name = "") {
  await loadFonts();
  const [canvas, c] = makeCanvas();
  scene(c, "NEW BADGE");
  medal(c, null);
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
  return toBlob(canvas);
}

/* The picture for a friend card: the level in the medal, the name, and four numbers. */
export async function cardImage(card) {
  await loadFonts();
  const [canvas, c] = makeCanvas();
  scene(c, "SKATER CARD", card.look ? lookById(card.look) : null);
  medal(c, card.level);
  c.fillStyle = "rgba(74, 47, 0, 0.8)";
  c.font = '600 34px "Jost", system-ui, sans-serif';
  c.fillText("LEVEL", W / 2, 345);
  c.fillStyle = "#fff4cd";
  c.font = 'italic 800 104px "Bodoni Moda", Georgia, serif';
  let name = card.name;
  while (c.measureText(name).width > W - 140 && name.length > 3) name = name.slice(0, -1);
  c.fillText(name === card.name ? name : name + "…", W / 2, 930);
  const stats = [[card.xpTotal, "XP in all"], [card.xpWeek, "XP, last 7 days"], [card.streak, card.streak === 1 ? "week streak" : "week streak"], [card.badges, card.badges === 1 ? "badge" : "badges"]];
  stats.forEach(([n, label], i) => {
    const x = i % 2 ? 740 : 340;
    const y = 1030 + Math.floor(i / 2) * 120;
    c.fillStyle = "#fff4cd";
    c.font = 'italic 800 64px "Bodoni Moda", Georgia, serif';
    c.fillText(String(n), x, y);
    c.fillStyle = "rgba(223, 243, 255, 0.85)";
    c.font = '500 32px "Jost", system-ui, sans-serif';
    c.fillText(label, x, y + 40);
  });
  c.fillStyle = "rgba(223, 243, 255, 0.7)";
  c.font = '500 30px "Jost", system-ui, sans-serif';
  c.fillText(`As of ${fmtDate(card.updatedAt.slice(0, 10), { month: "long", day: "numeric", year: "numeric" })}`, W / 2, 1290);
  return toBlob(canvas);
}

/* Hand a picture to the share sheet, or save it as a file when the device cannot share files. */
async function sendImage(blob, filename, title, text) {
  const file = new File([blob], filename, { type: "image/jpeg" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Picture saved. Look in your downloads.");
}

async function pictureOf(make, what) {
  try {
    return await make();
  } catch (err) {
    toast(`Could not make the ${what} picture on this device.`);
    return null;
  }
}

export async function shareBadge(badge, name = "") {
  const blob = await pictureOf(() => badgeImage(badge, name), "badge");
  if (blob) await sendImage(blob, `myskate-${badge.id}.jpg`, `${badge.name} · MySkate`, `I earned the ${badge.name} badge on MySkate.`);
}

export async function shareCardPicture(card) {
  const blob = await pictureOf(() => cardImage(card), "card");
  if (blob) await sendImage(blob, "myskate-card.jpg", "My MySkate card", `${card.name} on MySkate`);
}

/* The link that adds you as a friend, through the share sheet; or copied when the device cannot share. */
export async function shareCardLink(card) {
  const url = cardLink(card, appBase());
  const text = `${card.name} on MySkate: level ${card.level}, ${card.streak} ${card.streak === 1 ? "week" : "weeks"} in a row. Add me as a friend:`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "My MySkate card", text, url });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  await copyCardLink(card);
}

export async function copyCardLink(card) {
  const url = cardLink(card, appBase());
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied. Paste it into a message.");
  } catch (err) {
    /* no clipboard (an older browser or a blocked page): show the link to copy by hand */
    const sheet = openSheet(
      html`<h2 class="sheet__title sheet__title--small">Copy your link</h2>
        <label class="field"><span>Send this to a friend</span><input class="input" id="link-out" type="text" readonly value="${url}"></label>
        <div class="sheet__foot"><span></span><button class="btn btn--small" type="button" data-close="done">Done</button></div>`,
      { label: "Copy your link" }
    );
    const input = $("#link-out", sheet.dialog);
    input.focus();
    input.select();
  }
}
