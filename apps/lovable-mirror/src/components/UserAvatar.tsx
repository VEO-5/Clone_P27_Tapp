"use client";

import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { resolveUserAvatar, resolveUserAvatarFallback } from "@/lib/shadows";
import { cn, initials } from "@/lib/utils";

/**
 * Shared avatar for the whole app — queue table, cards, admin tables, headers.
 *
 * Chain (same for Google + email/OTP sign-ins):
 *  1. `avatarUrl` (upload / Google photo from GET /auth/me)
 *  2. Gravatar photo linked to the email
 *  3. self-hosted Shadows Duotone seeded by email
 *  4. initials (when every image errors)
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
  const primary = useMemo(
    () => resolveUserAvatar({ email, name, avatarUrl }),
    [email, name, avatarUrl],
  );
  const fallbackSrc = useMemo(
    () => resolveUserAvatarFallback({ email, name }),
    [email, name],
  );
  // Staged chain: 0 = avatarUrl/Gravatar, 1 = Shadows, 2 = initials only.
  // Gravatar 404s (d=404) when the email has no Gravatar — advance one stage
  // per error. Shadows is a data-URI and never errors, so stage 1 sticks.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
  }, [primary, fallbackSrc]);
  const showImage = stage < 2;
  const src = stage === 0 ? primary : fallbackSrc;

  return (
    <Avatar className={cn("shrink-0", className)} aria-label={label}>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setStage((s) => s + 1)}
          className={cn("aspect-square size-full object-cover", imageClassName)}
        />
      )}
      <AvatarFallback className={cn("text-[11px]", fallbackClassName)}>
        {initials(label)}
      </AvatarFallback>
    </Avatar>
  );
}
