"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import type { RoleName } from "@/lib/auth";
import { landingForRole } from "@/lib/auth";

import { Forbidden } from "./Forbidden";
import { useSession } from "./useSession";

/**
 * Client role gate for a route group layout.
 * - loading → skeleton; signed out → /sign-in?next=; wrong role → 403.
 * Role enforcement is duplicated by the API; this is only the UI layer.
 */
export function RoleGate({
  allow,
  children,
}: {
  allow: readonly RoleName[];
  children: ReactNode;
}) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.isError) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/";
      router.replace(`/sign-in?next=${encodeURIComponent(next)}`);
    }
  }, [session.isError, router]);

  if (session.isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  if (session.isError || !session.data) return null;

  const role = session.data.role as RoleName;
  if (!allow.includes(role)) {
    return (
      <Forbidden role={role} allowed={allow} backHref={landingForRole(role)} backLabel="Back to home" />
    );
  }

  return <>{children}</>;
}
