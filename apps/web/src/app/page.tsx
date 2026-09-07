"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Skeleton } from "@/components/shadcn/skeleton";
import { useSession } from "@/features/auth/useSession";
import { landingForRole } from "@/lib/auth";

/** Role landing: signed out → /sign-in, else the role's home. */
export default function RootPage() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.isPending) return;
    router.replace(session.data ? landingForRole(session.data.role) : "/sign-in");
  }, [session.isPending, session.data, router]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  );
}
