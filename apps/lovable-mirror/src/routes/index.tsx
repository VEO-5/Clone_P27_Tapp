import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Skeleton } from "@/components/shadcn/skeleton";
import { useSession } from "@/features/auth/useSession";
import { landingForRole } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Sphere Support · Pearl 27" }] }),
  component: function RootPageComponent() {
    const session = useSession();
    const navigate = useNavigate();
    useEffect(() => {
      if (session.isPending) return;
      const target = session.data ? landingForRole(session.data.role as never) : "/sign-in";
      void navigate({ to: target as never, replace: true });
    }, [session.isPending, session.data, navigate]);
    return (
      <div className="mx-auto max-w-xl px-4 py-20" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  },
});
