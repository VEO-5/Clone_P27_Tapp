import { createFileRoute } from "@tanstack/react-router";

// Mirrors apps/web/src/app/(desk)/desk/page.tsx -> DeskBoard.
export const Route = createFileRoute("/desk/")({
  component: function DeskComponent() {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="eyebrow">Desk</p>
        <h1>Desk</h1>
        <p className="text-sm opacity-70">PORT: features/desk/DeskBoard.</p>
      </div>
    );
  },
});
