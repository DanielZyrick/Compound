import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Google Calendar tokens are stored encrypted (AES-256-GCM), so a copy of the
// database alone can't read anyone's calendar. The key lives only in the
// environment: CALENDAR_TOKEN_KEY, 32 random bytes in base64.

const VERSION = "v1";

export function isEncryptionConfigured(): boolean {
  try {
    keyFrom(process.env.CALENDAR_TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
}

function keyFrom(base64: string | undefined): Buffer {
  const key = Buffer.from(base64 ?? "", "base64");
  if (key.length !== 32) throw new Error("CALENDAR_TOKEN_KEY must be 32 bytes, base64-encoded");
  return key;
}

/** "v1.<iv>.<tag>.<ciphertext>", each part base64url. A fresh random IV every time. */
export function encryptToken(plain: string, base64Key = process.env.CALENDAR_TOKEN_KEY): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(base64Key), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** The original token. Throws if the value was changed or the key is wrong. */
export function decryptToken(sealed: string, base64Key = process.env.CALENDAR_TOKEN_KEY): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || data === undefined) throw new Error("Unknown token format");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(base64Key), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
