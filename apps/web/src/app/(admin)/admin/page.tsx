import { Suspense } from "react";

import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata = {
  title: "Support desk",
};

/**
 * Phase 0 placeholder: renders against MSW mocks (Phase 3 wires /desk/*).
 */
export default function AdminPage() {
  return (
    <div className="h-dvh overflow-hidden bg-ink-950">
      <Suspense fallback={null}>
        <AdminDashboard tickets={[]} employeeEmail={null} employeeAvatarUrl={null} />
      </Suspense>
    </div>
  );
}
