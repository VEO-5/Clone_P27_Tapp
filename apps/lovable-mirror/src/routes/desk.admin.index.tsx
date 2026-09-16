import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/(desk)/desk/admin/page.tsx -> ManagementDashboard.
export const Route = createFileRoute("/desk/admin/")({
  component: function AdminComponent() {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="eyebrow">Admin</p>
        <h1>Dashboard</h1>
        <p className="text-sm opacity-70">PORT: features/admin/ManagementDashboard.</p>
      </div>
    );
  },
});
