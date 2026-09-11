import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/(employee)/tickets/[reference]/page.tsx.
// NOTE the deliberate split: employee route keys on `reference` (PRL-7K4M2X),
// the desk route on `id` (UUID). Do not normalise them.
export const Route = createFileRoute("/tickets/$reference")({
  component: function TicketReferenceComponent() {
    const { reference } = Route.useParams();
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="eyebrow">Ticket</p>
        <h1 className="mono-ref">{reference}</h1>
        <p className="text-sm opacity-70">PORT: features/tickets/TicketDetail (timeline, attachments).</p>
      </div>
    );
  },
});
