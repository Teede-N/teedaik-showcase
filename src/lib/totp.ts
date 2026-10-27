/* Extrait de Teedaïk — TOTP (RFC 6238) : codes à 6 chiffres compatibles Google Authenticator,
   Authy, Microsoft Authenticator. Implémentation sans dépendance, basée sur node:crypto (algorithme public et standard). */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret() {
  return base32Encode(randomBytes(20));
}

export function currentStep(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

export function totpAt(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

/* Renvoie le pas de temps qui correspond au code (tolérance ±1 pas = ±30 s), ou null.
   Comparaison à temps constant pour ne rien révéler du code attendu. */
export function matchTotp(secret, code, nowMs = Date.now(), window = 1) {
  const clean = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(nowMs);
  for (let i = -window; i <= window; i++) {
    const expected = totpAt(secret, step + i);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return step + i;
  }
  return null;
}

export function otpauthUrl(secret, accountName, issuer = "Teedaïk") {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
