import { createFileRoute } from "@tanstack/react-router";
import TicketsDashboard from "@/features/tickets/TicketsDashboard";
export const Route = createFileRoute("/tickets/")({
  component: function TicketsComponent() {
    return <TicketsDashboard />;
  },
});
