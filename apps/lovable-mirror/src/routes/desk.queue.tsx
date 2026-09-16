import { createFileRoute } from "@tanstack/react-router";
import { DeskQueue } from "@/features/desk/DeskQueue";
import { queueSearchSchema } from "@/lib/queue-params";
export const Route = createFileRoute("/desk/queue")({
  validateSearch: queueSearchSchema,
  component: function QueueComponent() {
    return <DeskQueue />;
  },
});
