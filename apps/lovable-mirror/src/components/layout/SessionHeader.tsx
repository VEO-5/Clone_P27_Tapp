import { useLocation } from "@tanstack/react-router";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { useSession } from "@/features/auth/useSession";
import type { RoleName } from "@/lib/auth";

/** Role-aware header: nav items + identity follow the session role. */
export function SessionHeader() {
  const session = useSession();
  const pathname = useLocation().pathname;
  const role = (session.data?.role as RoleName | undefined) ?? "signedOut";
  // Auth routes never show authed chrome: right after sign-in the session
  // cache flips before navigation lands, and without this guard the new
  // profile + Sign out flash over the sign-in card for a beat.
  if (pathname === "/sign-in" || pathname.startsWith("/auth/")) {
    return <SiteHeader role="signedOut" hideNav />;
  }
  return (
    <SiteHeader
      role={role === "employee" || role === "agent" || role === "admin" ? role : "signedOut"}
      employeeEmail={session.data?.email ?? null}
      employeeName={session.data?.name ?? null}
      employeeAvatarUrl={session.data?.avatarUrl ?? null}
      action={session.data ? <SignOutButton /> : undefined}
    />
  );
}
