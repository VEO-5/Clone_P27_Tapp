import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/(public)/auth/denied/page.tsx (title "Access denied").
// ?reason=domain copy; deactivated desk/admin accounts are demoted at sign-in
// and never land here.
export const Route = createFileRoute("/auth/denied")({
  head: () => ({ meta: [{ title: "Access denied · Pearl 27" }] }),
  component: function AuthDeniedComponent() {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <p className="eyebrow">Access denied</p>
        <h1>Can&apos;t sign you in</h1>
        <p className="text-sm opacity-70">PORT: denied copy (?reason=) + Try another account link.</p>
      </div>
    );
  },
});
