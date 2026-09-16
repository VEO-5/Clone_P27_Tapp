import { createFileRoute } from "@tanstack/react-router";

import { queueSearchSchema } from "@/lib/queue-params";

// Mirrors apps/web/src/app/(desk)/desk/queue/page.tsx (title "Queue") -> DeskQueue.
// Search params are typed + validated per route (FE-L-3.2). The old
// `pendingRef` workaround is gone: navigate({ search }) commits synchronously.
export const Route = createFileRoute("/desk/queue")({
  validateSearch: queueSearchSchema,
  head: () => ({ meta: [{ title: "Queue · Pearl 27" }] }),
  component: function QueueComponent() {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="eyebrow">Desk · Queue</p>
        <h1>Queue</h1>
        <p className="text-sm opacity-70">PORT: features/desk/DeskQueue + QueueFilters.</p>
      </div>
    );
  },
});
