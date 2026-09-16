"use client";

import { Avatar, Style } from "@dicebear/core";
import type { StyleDefinition } from "@dicebear/core";
import definition from "@dicebear/styles/shadows.json" with { type: "json" };

/**
 * Shadows "Duotone" preset — one indigo ink on its own pale tint.
 * Self-hosted via @dicebear/core + @dicebear/styles (no api.dicebear.com call).
 * Design: Shadows by DiceBear, CC0 1.0.
 * @see https://www.dicebear.com/styles/shadows
 */
const DUOTONE_PRESET: {
  backgroundColor: string[];
  inkColor: string[];
} = {
  // Pale blue-grey ground paired with its indigo ink from the style palette.
  backgroundColor: ["e3e6ed"],
  inkColor: ["33477f"],
};

const style = new Style(definition as unknown as StyleDefinition);

const cache = new Map<string, string>();

/** Stable seed — email preferred so avatar survives renames and matches future Gravatar key. */
export function avatarSeed(email?: string | null, name?: string | null): string {
  const seed = (email ?? name ?? "employee").trim().toLowerCase();
  return seed || "employee";
}

/** Deterministic Shadows SVG data-URI for a seed. Memoized in-module. */
export function shadowsAvatarUri(seed: string): string {
  const key = seed.trim().toLowerCase() || "employee";
  const hit = cache.get(key);
  if (hit) return hit;
  const uri = new Avatar(style, {
    seed: key,
    ...DUOTONE_PRESET,
  }).toDataUri();
  cache.set(key, uri);
  return uri;
}

/**
 * Single avatar resolution point for the whole app.
 *
 * Order (production-ready, Gravatar-ready):
 *  1. explicit avatarUrl (profile pic upload, or backend-supplied Gravatar from email on go-live)
 *  2. self-hosted Shadows Duotone fallback seeded by email
 *
 * When we go live, backend populates `avatarUrl` from the user's email
 * (e.g. Gravatar `.../avatar/<md5>?d=404`) — no UI changes needed.
 */
export function resolveUserAvatar({
  email,
  name,
  avatarUrl,
}: {
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}): string {
  if (avatarUrl) return avatarUrl;
  return shadowsAvatarUri(avatarSeed(email, name));
}
