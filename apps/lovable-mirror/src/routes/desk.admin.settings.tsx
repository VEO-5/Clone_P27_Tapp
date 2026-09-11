import { createFileRoute } from "@tanstack/react-router";

// Mirrors admin settings page (auto-release, hours, holidays, canned + CategoryManager).
export const Route = createFileRoute("/desk/admin/settings")({
  component: function SettingsComponent() {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="eyebrow">Admin · Settings</p>
        <h1>Settings</h1>
        <p className="text-sm opacity-70">PORT: settings form + CategoryManager.</p>
      </div>
    );
  },
});
