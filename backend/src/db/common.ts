import { createHash } from "node:crypto";

const DEFAULT_SESSION_TIMEOUT_MINUTES = 15;

export const SALT_ROUNDS = 12;

export function now(): Date {
  return new Date();
}

function sessionTimeoutMinutes(): number {
  const parsed = Number(process.env.SESSION_TIMEOUT_MINUTES);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return DEFAULT_SESSION_TIMEOUT_MINUTES;
}

export function expiresAtFrom(base: Date): Date {
  return new Date(base.getTime() + sessionTimeoutMinutes() * 60_000);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
