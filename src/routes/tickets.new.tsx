import { createFileRoute } from "@tanstack/react-router";

import { TicketForm } from "@/features/tickets/TicketForm";
import { useTicketSubmit } from "@/features/tickets/useTicketSubmit";

export const Route = createFileRoute("/tickets/new")({
  component: function NewTicketComponent() {
    const controller = useTicketSubmit();
    return <TicketForm controller={controller} />;
  },
});
