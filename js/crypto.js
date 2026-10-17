/* Passphrase-protected backups. The backup file's text is locked with AES-256-GCM, using a key made from your passphrase with
   PBKDF2 (SHA-256, many rounds, a random salt), all with the browser's own Web Crypto. Nothing leaves the device and there is
   no way to recover a forgotten passphrase. The file says how it was locked, and is checked before any work is done, so a
   damaged or hostile file cannot ask for an absurd amount of computing. */

export const KDF_ITERATIONS = 600000;
export const MIN_PASSPHRASE = 8;
const MIN_ITER = 1000;
const MAX_ITER = 2000000;
const MAX_FILE = 30_000_000;
const AAD = new TextEncoder().encode("MySkate-backup-v1");

const subtle = () => globalThis.crypto.subtle;

function toB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function keyFrom(passphrase, salt, iterations) {
  const raw = await subtle().importKey("raw", new TextEncoder().encode(String(passphrase).normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function readFile(text) {
  if (typeof text !== "string" || text.length > MAX_FILE) return null;
  try {
    const f = JSON.parse(text);
    return f && typeof f === "object" && f.app === "MySkate" && f.encrypted === true ? f : null;
  } catch (err) {
    return null;
  }
}

/* True when this backup text is a locked backup (and so needs a passphrase). */
export const isEncryptedBackup = (text) => readFile(text) !== null;

/* Lock a backup. Returns the text of the locked file. Throws if the passphrase is too short. */
export async function encryptBackup(plainText, passphrase, { iterations = KDF_ITERATIONS, now = new Date() } = {}) {
  if (typeof passphrase !== "string" || passphrase.length < MIN_PASSPHRASE) throw new Error("short");
  if (!Number.isInteger(iterations) || iterations < MIN_ITER || iterations > MAX_ITER) throw new Error("iterations");
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(passphrase, salt, iterations);
  const data = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, new TextEncoder().encode(plainText)));
  return JSON.stringify({ app: "MySkate", encrypted: true, v: 1, kdf: "PBKDF2-SHA256", iter: iterations, cipher: "AES-256-GCM", salt: toB64(salt), iv: toB64(iv), data: toB64(data), exportedAt: now.toISOString() }, null, 2);
}

/* Unlock a backup. Returns { ok: true, text } or { ok: false, error } where error is "format" (not a locked MySkate backup, or
   one this version cannot read) or "wrong" (the passphrase is wrong, or the file was changed). */
export async function decryptBackup(fileText, passphrase) {
  const f = readFile(fileText);
  if (!f || f.v !== 1 || f.kdf !== "PBKDF2-SHA256" || f.cipher !== "AES-256-GCM" || !Number.isInteger(f.iter) || f.iter < MIN_ITER || f.iter > MAX_ITER) return { ok: false, error: "format" };
  let salt;
  let iv;
  let data;
  try {
    salt = fromB64(f.salt);
    iv = fromB64(f.iv);
    data = fromB64(f.data);
  } catch (err) {
    return { ok: false, error: "format" };
  }
  if (salt.length !== 16 || iv.length !== 12 || data.length < 16) return { ok: false, error: "format" };
  if (typeof passphrase !== "string" || passphrase === "") return { ok: false, error: "wrong" };
  try {
    const key = await keyFrom(passphrase, salt, f.iter);
    const plain = await subtle().decrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, data);
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(plain) };
  } catch (err) {
    return { ok: false, error: "wrong" };
  }
}
