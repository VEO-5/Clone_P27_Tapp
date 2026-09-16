import { createFileRoute } from "@tanstack/react-router";
import { TicketDetail } from "@/features/tickets/TicketDetail";
export const Route = createFileRoute("/tickets/$reference")({
  component: function TicketDetailRoute() {
    const { reference } = Route.useParams();
    return <TicketDetail reference={reference} />;
  },
});
