import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminDashboard } from "@/components/AdminDashboard";
import { SignOutButton } from "@/components/SignOutButton";
import { Panel } from "@/components/ui/Panel";
import { isAuthenticated } from "@/lib/adminAuth";
import { getRepository } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Support desk",
};

export default async function AdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const repo = getRepository();
  const [tickets, stats] = await Promise.all([repo.listTickets(), repo.getStats()]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">System Support</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">The desk</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            Triage Sphere issues, update status, and reply. Employees see every change on their timeline.
          </p>
        </div>
        <SignOutButton />
      </div>

      <Panel lit className="p-5 sm:p-6">
        <Suspense fallback={null}>
          <AdminDashboard tickets={tickets} stats={stats} />
        </Suspense>
      </Panel>
    </div>
  );
}
