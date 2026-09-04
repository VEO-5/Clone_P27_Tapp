"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { useSession } from "@/features/auth/useSession";
import type { RoleName } from "@/lib/auth";

/** Role-aware header: nav items + identity follow the session role. */
export function SessionHeader() {
  const session = useSession();
  const role = (session.data?.role as RoleName | undefined) ?? "signedOut";
  return (
    <SiteHeader
      role={role === "employee" || role === "agent" || role === "admin" ? role : "signedOut"}
      employeeEmail={session.data?.email ?? null}
      employeeAvatarUrl={session.data?.avatarUrl ?? null}
      action={session.data ? <SignOutButton /> : undefined}
    />
  );
}
