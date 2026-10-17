import test from "node:test";
import assert from "node:assert/strict";
import { encryptBackup, decryptBackup, isEncryptedBackup, KDF_ITERATIONS, MIN_PASSPHRASE } from "../js/crypto.js";
import { defaultState, exportJSON, parseBackup } from "../js/store.js";
import { session } from "./helpers.js";

const FAST = { iterations: 1000, now: new Date("2026-10-17T12:00:00Z") };
const PASS = "correct horse battery";

const withSecret = () => {
  const s = defaultState();
  s.profile.name = "Samantha-Quill-Tester";
  s.sessions.push({ ...session("2026-10-05"), note: "SECRET-NOTE-ABOUT-MY-KNEE" });
  return exportJSON(s);
};

test("a locked backup opens with the right passphrase and gives back exactly what went in", async () => {
  const plain = withSecret();
  const file = await encryptBackup(plain, PASS, FAST);
  const out = await decryptBackup(file, PASS);
  assert.deepEqual([out.ok, out.text === plain], [true, true]);
  const parsed = parseBackup(out.text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.state.sessions[0].note, "SECRET-NOTE-ABOUT-MY-KNEE");
});

test("the file says how it was locked and shows nothing readable", async () => {
  const plain = withSecret();
  const file = await encryptBackup(plain, PASS, FAST);
  const f = JSON.parse(file);
  assert.deepEqual([f.app, f.encrypted, f.v, f.kdf, f.cipher, f.iter, f.exportedAt], ["MySkate", true, 1, "PBKDF2-SHA256", "AES-256-GCM", 1000, "2026-10-17T12:00:00.000Z"]);
  assert.ok(!file.includes("SECRET-NOTE") && !file.includes("Samantha-Quill") && !file.includes('"sessions"') && !file.includes("schemaVersion"), "no part of the backup shows through");
  assert.equal(Buffer.from(f.salt, "base64").length, 16);
  assert.equal(Buffer.from(f.iv, "base64").length, 12);
  assert.ok(KDF_ITERATIONS >= 600000, "real backups use many rounds");
});

test("a wrong passphrase, or a file that was changed, is refused", async () => {
  const file = await encryptBackup(withSecret(), PASS, FAST);
  for (const bad of ["correct horse battery ", "Correct horse battery", "", "password", undefined, null]) assert.deepEqual(await decryptBackup(file, bad), { ok: false, error: "wrong" }, String(bad));
  const f = JSON.parse(file);
  const flip = (b64) => {
    const bytes = Buffer.from(b64, "base64");
    bytes[bytes.length - 1] ^= 1;
    return bytes.toString("base64");
  };
  for (const field of ["data", "salt", "iv"]) assert.equal((await decryptBackup(JSON.stringify({ ...f, [field]: flip(f[field]) }), PASS)).error, "wrong", field);
  assert.equal((await decryptBackup(JSON.stringify({ ...f, iter: 1001 }), PASS)).error, "wrong", "a changed round count gives a different key");
});

test("a file that is not a locked MySkate backup is a format problem, and a hostile one does no work", async () => {
  const file = await encryptBackup(withSecret(), PASS, FAST);
  const f = JSON.parse(file);
  const cases = [
    "", "not json", "{}", withSecret(), JSON.stringify({ ...f, v: 2 }), JSON.stringify({ ...f, kdf: "scrypt" }), JSON.stringify({ ...f, cipher: "AES-128-CBC" }),
    JSON.stringify({ ...f, iter: 999 }), JSON.stringify({ ...f, iter: 2000001 }), JSON.stringify({ ...f, iter: 1e12 }), JSON.stringify({ ...f, iter: "1000" }),
    JSON.stringify({ ...f, salt: "AAAA" }), JSON.stringify({ ...f, iv: "AAAA" }), JSON.stringify({ ...f, data: "AAAA" }), JSON.stringify({ ...f, data: "%%%not base64%%%" }), JSON.stringify({ ...f, app: "Other" }), JSON.stringify({ ...f, encrypted: "yes" }),
  ];
  const started = Date.now();
  for (const c of cases) assert.deepEqual(await decryptBackup(c, PASS), { ok: false, error: "format" }, c.slice(0, 40));
  assert.ok(Date.now() - started < 1500, "refusing them is quick: no key is made for a file with an absurd round count");
  assert.equal((await decryptBackup(null, PASS)).error, "format");
  assert.equal((await decryptBackup("x".repeat(30_000_001), PASS)).error, "format");
});

test("each locking is different, even for the same backup and passphrase", async () => {
  const a = JSON.parse(await encryptBackup("same", PASS, FAST));
  const b = JSON.parse(await encryptBackup("same", PASS, FAST));
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.data, b.data);
});

test("a short passphrase is refused when locking, and the round count must be sensible", async () => {
  await assert.rejects(() => encryptBackup("x", "short", FAST), /short/);
  await assert.rejects(() => encryptBackup("x", "a".repeat(MIN_PASSPHRASE - 1), FAST), /short/);
  await assert.rejects(() => encryptBackup("x", PASS, { iterations: 10 }), /iterations/);
  await assert.rejects(() => encryptBackup("x", PASS, { iterations: 5e6 }), /iterations/);
  await assert.rejects(() => encryptBackup("x", undefined, FAST), /short/);
  const ok = await encryptBackup("x", "a".repeat(MIN_PASSPHRASE), FAST);
  assert.equal((await decryptBackup(ok, "a".repeat(MIN_PASSPHRASE))).ok, true);
});

test("accents and other languages work in a passphrase, however the keyboard typed them", async () => {
  const composed = "pässwörd-é-滑冰-⛸️";
  const decomposed = composed.normalize("NFD");
  assert.notEqual(composed, decomposed);
  const file = await encryptBackup("hello", composed, FAST);
  assert.equal((await decryptBackup(file, decomposed)).text, "hello");
  assert.equal((await decryptBackup(file, composed)).text, "hello");
});

test("a big backup locks and unlocks (the base64 step does not run out of room)", async () => {
  const big = "x".repeat(3_000_000);
  const file = await encryptBackup(big, PASS, FAST);
  assert.equal((await decryptBackup(file, PASS)).text.length, 3_000_000);
});

test("a locked backup is recognised, and the normal reader says to unlock it first", async () => {
  const file = await encryptBackup(withSecret(), PASS, FAST);
  assert.equal(isEncryptedBackup(file), true);
  assert.equal(isEncryptedBackup(withSecret()), false);
  for (const junk of ["", "{", "[]", "null", "42", JSON.stringify({ app: "MySkate", encrypted: false })]) assert.equal(isEncryptedBackup(junk), false, junk);
  const parsed = parseBackup(file);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /passphrase/);
});
