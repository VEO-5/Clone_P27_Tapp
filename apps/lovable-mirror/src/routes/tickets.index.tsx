import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/(employee)/tickets/page.tsx -> TicketsDashboard.
export const Route = createFileRoute("/tickets/")({
  component: function TicketsComponent() {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="eyebrow">My tickets</p>
        <h1>My tickets</h1>
        <p className="text-sm opacity-70">PORT: features/tickets/TicketsDashboard.</p>
      </div>
    );
  },
});
