import { Inbox, Plus } from "lucide-react";

import { LinkButton } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";

export const metadata = {
  title: "My tickets",
};

/**
 * Phase 0 placeholder: employee dashboard with /tickets/mine lands in Phase 2.
 */
export default function MyTicketsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your inbox</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">My tickets</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            Phase 2 wires this to <span className="mono-ref">GET /tickets/mine</span> with MSW mocks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/" variant="secondary" size="sm" icon={<Plus className="size-3.5" />}>
            New ticket
          </LinkButton>
        </div>
      </div>

      <Panel tone="night">
        <EmptyState
          tone="night"
          icon={<Inbox className="size-5" aria-hidden />}
          title="No tickets yet in Phase 0"
          description="Submit a Sphere issue and it will land here with a live status once Phase 2 ships."
        />
      </Panel>
    </div>
  );
}
