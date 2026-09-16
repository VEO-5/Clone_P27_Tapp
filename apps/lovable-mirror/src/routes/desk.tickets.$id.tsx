import { createFileRoute } from "@tanstack/react-router";
import { ReplyScreen } from "@/features/desk/ReplyScreen";
export const Route = createFileRoute("/desk/tickets/$id")({
  component: function DeskTicketRoute() {
    const { id } = Route.useParams();
    return <ReplyScreen id={id} />;
  },
});
