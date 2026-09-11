import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/(employee)/tickets/new/page.tsx (title "Report an issue").
export const Route = createFileRoute("/tickets/new")({
  head: () => ({ meta: [{ title: "Report an issue · Pearl 27" }] }),
  component: function NewTicketComponent() {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
        <p className="eyebrow">Report an issue</p>
        <h1>Report an issue</h1>
        <p className="text-sm opacity-70">PORT: features/tickets/TicketForm.</p>
      </div>
    );
  },
});
