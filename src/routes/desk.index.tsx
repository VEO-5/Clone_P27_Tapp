import { createFileRoute } from "@tanstack/react-router";
import { DeskBoard } from "@/features/desk/DeskBoard";
export const Route = createFileRoute("/desk/")({
  component: function DeskComponent() {
    return <DeskBoard />;
  },
});
