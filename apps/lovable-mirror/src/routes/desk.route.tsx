import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RoleGate } from "@/features/auth/RoleGate";

// Mirrors apps/web/src/app/(desk)/layout.tsx:
// RoleGate allow=["agent","admin"]. DeskShell wires in with the desk slice;
// chrome renders once via the single Outlet (FE-L-2.5).
export const Route = createFileRoute("/desk")({
  component: function DeskLayoutComponent() {
    return (
      <RoleGate allow={["agent", "admin"]}>
        <Outlet />
      </RoleGate>
    );
  },
});
