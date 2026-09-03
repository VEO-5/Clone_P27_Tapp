import { createHash } from "node:crypto";

/** Gravatar URL for an email. Server-only (uses node:crypto). */
export function gravatarUrl(email: string, size = 64): string {
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}
