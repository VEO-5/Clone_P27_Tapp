import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RoleGate } from "@/features/auth/RoleGate";

// Mirrors apps/web/src/app/(employee)/layout.tsx:
// RoleGate allow=["employee","agent","admin"]. Any signed-in role may view.
export const Route = createFileRoute("/tickets")({
  component: function EmployeeLayoutComponent() {
    return (
      <RoleGate allow={["employee", "agent", "admin"]}>
        <Outlet />
      </RoleGate>
    );
  },
});
