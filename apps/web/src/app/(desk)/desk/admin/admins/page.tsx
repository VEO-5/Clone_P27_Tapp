"use client";

import { useQuery } from "@tanstack/react-query";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { AdminTable } from "@/features/admin/AdminTable";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import type { MockAgent } from "@/mocks/fixtures";

export default function AdminsPage() {
  const admins = useQuery({ queryKey: [...queryKeys.me, "admins"], queryFn: () => apiFetch<MockAgent[]>("/admin/admins") });

  return (
    <Panel lit>
      <PanelHeader
        eyebrow="Admin · Admins"
        title="Admin management"
        description="Invite by email, track status, deactivate to remove admin access."
      />
      <div className="p-6 sm:p-8">
        {admins.isPending && (
          <div aria-busy="true" aria-label="Loading admins">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        )}
        {admins.isError && <p role="alert">Couldn&apos;t load admins. Try again.</p>}
        {admins.data && <AdminTable initialAdmins={admins.data} />}
      </div>
    </Panel>
  );
}
