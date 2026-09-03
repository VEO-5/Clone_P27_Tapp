import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminDashboard } from "@/components/AdminDashboard";
import { isAuthenticated } from "@/lib/adminAuth";
import { gravatarUrl } from "@/lib/avatar";
import { getEmployeeSession } from "@/lib/employeeAuth";
import { getRepository } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Support desk",
};

export default async function AdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const repo = getRepository();
  const [tickets, employee] = await Promise.all([
    repo.listTickets(),
    getEmployeeSession(),
  ]);

  return (
    <div className="h-dvh overflow-hidden bg-ink-950">
      <Suspense fallback={null}>
        <AdminDashboard
          tickets={tickets}
          employeeEmail={employee?.email ?? null}
          employeeAvatarUrl={employee?.email ? gravatarUrl(employee.email) : null}
        />
      </Suspense>
    </div>
  );
}
