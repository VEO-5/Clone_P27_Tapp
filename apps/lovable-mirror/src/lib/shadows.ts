"use client";

import { Avatar, Style } from "@dicebear/core";
import type { StyleDefinition } from "@dicebear/core";
import definition from "@dicebear/styles/shadows.json" with { type: "json" };

import { gravatarUrlForEmail } from "@/lib/gravatar";

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
 * Order (applies to Google + email/OTP sign-ins, everywhere):
 *  1. explicit avatarUrl (upload, or Google photo backfilled by GET /auth/me)
 *  2. Gravatar photo linked to the email (`d=404` so missing photos error out)
 *  3. self-hosted Shadows Duotone fallback seeded by email
 *  4. initials (rendered by UserAvatar when every image errors)
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
  return gravatarUrlForEmail(email) ?? shadowsAvatarUri(avatarSeed(email, name));
}

/**
 * Guaranteed-local fallback for stage 2 of the UserAvatar chain.
 * The Gravatar URL above 404s when the email has no Gravatar — UserAvatar
 * swaps to this Shadows URI on error, which never needs the network.
 */
export function resolveUserAvatarFallback({
  email,
  name,
}: {
  email?: string | null;
  name?: string | null;
}): string {
  return shadowsAvatarUri(avatarSeed(email, name));
}
