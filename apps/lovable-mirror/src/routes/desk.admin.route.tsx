import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RoleGate } from "@/features/auth/RoleGate";

// Mirrors apps/web/src/app/(desk)/desk/admin/layout.tsx:
// RoleGate allow=["admin"]. Agents hitting /desk/admin/* get the 403 the old
// /admin group served. The desk sidebar (parent layout) stays mounted.
export const Route = createFileRoute("/desk/admin")({
  component: function DeskAdminLayoutComponent() {
    return (
      <RoleGate allow={["admin"]}>
        <Outlet />
      </RoleGate>
    );
  },
});
