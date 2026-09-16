import { createFileRoute } from "@tanstack/react-router";
import { TicketForm } from "@/features/tickets/TicketForm";
export const Route = createFileRoute("/tickets/new")({
  component: function NewTicketComponent() {
    return <TicketForm />;
  },
});
