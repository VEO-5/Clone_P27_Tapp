import { createFileRoute } from "@tanstack/react-router";

// Mirrors admin audit page (paginated, expandable diffs).
export const Route = createFileRoute("/desk/admin/audit")({
  component: function AuditComponent() {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="eyebrow">Admin · Audit</p>
        <h1>Audit log</h1>
        <p className="text-sm opacity-70">PORT: audit table (?limit=&cursor=).</p>
      </div>
    );
  },
});
