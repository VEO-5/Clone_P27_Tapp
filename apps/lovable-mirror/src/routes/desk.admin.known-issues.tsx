import { createFileRoute } from "@tanstack/react-router";

// Mirrors admin known-issues page (incident banners: list, create, end now).
export const Route = createFileRoute("/desk/admin/known-issues")({
  component: function KnownIssuesComponent() {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="eyebrow">Admin · Known issues</p>
        <h1>Incident banners</h1>
        <p className="text-sm opacity-70">PORT: known-issues form + list.</p>
      </div>
    );
  },
});
