import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/page.tsx: role landing — signed out -> /sign-in,
// else the role's home (landingForRole). Real session check wires in Phase 4.
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Sphere Support · Pearl 27" }] }),
  component: function RootPageComponent() {
    return (
      <div className="mx-auto max-w-xl px-4 py-20" aria-busy="true" aria-label="Loading">
        <p className="eyebrow">Pearl 27 · Sphere Support</p>
        <h1>Resolving your home…</h1>
        <p className="text-sm opacity-70">PORT: useSession + landingForRole redirect.</p>
        <p className="text-sm opacity-70">Phase 2 ports: /sign-in · /tickets · /desk/queue</p>
      </div>
    );
  },
});
