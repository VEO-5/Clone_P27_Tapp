import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/(desk)/desk/tickets/[id]/page.tsx -> ReplyScreen.
// Keys on UUID `id` (contrast /tickets/$reference).
export const Route = createFileRoute("/desk/tickets/$id")({
  component: function DeskTicketComponent() {
    const { id } = Route.useParams();
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="eyebrow">Desk ticket</p>
        <h1 className="mono-ref">{id}</h1>
        <p className="text-sm opacity-70">PORT: features/desk/ReplyScreen.</p>
      </div>
    );
  },
});
