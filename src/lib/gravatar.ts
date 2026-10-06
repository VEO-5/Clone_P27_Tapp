"use client";

import md5 from "blueimp-md5";

/**
 * Browser-safe Gravatar URL for an email (MD5 in the browser — the
 * server-only `lib/avatar.ts` uses node:crypto and can't be imported here).
 * Returns null when there is no usable email. `d=404` lets callers detect
 * "no Gravatar" via img onError and fall through to the generated avatar.
 */
export function gravatarUrlForEmail(email?: string | null, size = 64): string | null {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  return `https://www.gravatar.com/avatar/${md5(normalized)}?s=${size}&d=404`;
}
