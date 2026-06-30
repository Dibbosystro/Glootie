import "server-only";

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { allowedSettingsEnvKeys } from "@/lib/integration-config";

const appLocalEnvPath = join(process.cwd(), ".env.local");
const workspaceEnvPath = join(dirname(process.cwd()), ".env");
let appLocalEnvCache: Record<string, string> | null = null;
let workspaceEnvCache: Record<string, string> | null = null;

export function getServerEnv(key: string): string | undefined {
  return process.env[key] || readEnvFile(appLocalEnvPath, "app")[key] || readEnvFile(workspaceEnvPath, "workspace")[key];
}

export function getEnvKeyConfigured(key: string): boolean {
  return Boolean(getServerEnv(key));
}

export function upsertLocalEnv(values: Record<string, string>): void {
  const current = readEnvFile(appLocalEnvPath, "app");
  const next = { ...current };

  for (const [key, value] of Object.entries(values)) {
    if (!allowedSettingsEnvKeys.has(key)) continue;
    const trimmed = value.trim();
    if (trimmed) {
      next[key] = trimmed;
      process.env[key] = trimmed;
    }
  }

  writeEnvFile(next);
}

export function removeLocalEnv(keys: string[]): void {
  const current = readEnvFile(appLocalEnvPath, "app");
  const next = { ...current };

  for (const key of keys) {
    if (!allowedSettingsEnvKeys.has(key)) continue;
    delete next[key];
    delete process.env[key];
  }

  writeEnvFile(next);
}

function readEnvFile(path: string, cache: "app" | "workspace"): Record<string, string> {
  if (cache === "app" && appLocalEnvCache) return appLocalEnvCache;
  if (cache === "workspace" && workspaceEnvCache) return workspaceEnvCache;

  const parsed: Record<string, string> = {};

  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      parsed[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Vercel should use real environment variables. The workspace .env fallback
    // is only for local Codex/dev runs where the key already exists one level up.
  }

  if (cache === "app") appLocalEnvCache = parsed;
  if (cache === "workspace") workspaceEnvCache = parsed;
  return parsed;
}

function writeEnvFile(values: Record<string, string>): void {
  const sortedKeys = Object.keys(values).sort();
  const content = [
    "# Managed by Glootie settings. Do not commit this file.",
    ...sortedKeys.map((key) => `${key}=${quoteEnv(values[key])}`),
    ""
  ].join("\n");
  writeFileSync(appLocalEnvPath, content, "utf8");
  appLocalEnvCache = null;
}

function quoteEnv(value: string): string {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  return JSON.stringify(value);
}
