import { createFileRoute } from "@tanstack/react-router";

// Mirrors admin admins page -> AdminTable.
export const Route = createFileRoute("/desk/admin/admins")({
  component: function AdminsComponent() {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="eyebrow">Admin · Admins</p>
        <h1>Admin management</h1>
        <p className="text-sm opacity-70">PORT: features/admin/AdminTable.</p>
      </div>
    );
  },
});
