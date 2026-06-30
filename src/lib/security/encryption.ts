import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/server-env";

const algorithm = "aes-256-gcm";
const version = "v1";

type EncryptedPayload = {
  v: typeof version;
  iv: string;
  tag: string;
  data: string;
};

export function canEncryptCredentials(): boolean {
  return Boolean(getCredentialEncryptionSecret());
}

export function encryptJson(value: unknown): EncryptedPayload {
  const key = getCredentialEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);

  return {
    v: version,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: data.toString("base64url")
  };
}

export function decryptJson<T>(payload: unknown): T | null {
  if (!isEncryptedPayload(payload)) return null;

  const key = getCredentialEncryptionKey();
  const decipher = createDecipheriv(algorithm, key, Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.data, "base64url")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}

function getCredentialEncryptionKey(): Buffer {
  const secret = getCredentialEncryptionSecret();
  if (!secret) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is required before saving encrypted integration credentials.");
  }
  return createHash("sha256").update(secret).digest();
}

function getCredentialEncryptionSecret(): string | undefined {
  const explicit = getServerEnv("CREDENTIAL_ENCRYPTION_KEY");
  if (explicit) return explicit;

  const authSecret = getServerEnv("AUTH_COOKIE_SECRET");
  if (process.env.NODE_ENV !== "production" && authSecret && authSecret !== "dev-only-change-me") return authSecret;
  return undefined;
}

function isEncryptedPayload(payload: unknown): payload is EncryptedPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<EncryptedPayload>;
  return candidate.v === version && typeof candidate.iv === "string" && typeof candidate.tag === "string" && typeof candidate.data === "string";
}
