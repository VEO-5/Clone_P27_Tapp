"use client";

import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { resolveUserAvatar } from "@/lib/shadows";
import { cn, initials } from "@/lib/utils";

/**
 * Shared avatar for the whole app — queue table, cards, admin tables, headers.
 *
 * - Prefers `avatarUrl` (upload / future backend Gravatar-from-email).
 * - Falls back to self-hosted Shadows Duotone seeded by email.
 * - Initials stay as Radix fallback for loading / error / a11y.
 */
export function UserAvatar({
  email,
  name,
  avatarUrl,
  className,
  imageClassName,
  fallbackClassName,
}: {
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const label = (name ?? email ?? "Employee").trim() || "Employee";
  const src = useMemo(
    () => resolveUserAvatar({ email, name, avatarUrl }),
    [email, name, avatarUrl],
  );
  const [failed, setFailed] = useState(false);

  return (
    <Avatar className={cn("shrink-0", className)} aria-label={label}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("aspect-square size-full object-cover", imageClassName)}
        />
      )}
      <AvatarFallback className={cn("text-[11px]", fallbackClassName)}>
        {initials(label)}
      </AvatarFallback>
    </Avatar>
  );
}
