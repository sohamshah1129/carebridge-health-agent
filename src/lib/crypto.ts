import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function key(): Buffer {
  const value = process.env.PHI_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) throw new Error("PHI_ENCRYPTION_KEY must be a 32-byte hex value.");
  return Buffer.from(value, "hex");
}

export function encrypt(value: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}

export function decrypt(value: string): string {
  const [iv, tag, data] = value.split("."); if (!iv || !tag || !data) throw new Error("Invalid encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function hashSensitive(value: string): string {
  return createHmac("sha256", key()).update(value.trim().toLowerCase()).digest("hex");
}
