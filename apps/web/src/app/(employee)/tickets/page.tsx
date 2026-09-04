"use client";

import { LinkButton } from "@/components/ui/Button";
import { NightStat } from "@/components/ui/NightStat";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/Panel";
import { useSession } from "@/features/auth/useSession";

/** Employee dashboard — full version with /tickets/mine lands in Phase 2. */
export default function TicketsPage() {
  const session = useSession();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your inbox</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">My tickets</h1>
          {session.data && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
              Submitting as <span className="font-medium text-pearl">{session.data.name}</span> ·{" "}
              {session.data.email}
            </p>
          )}
        </div>
        <LinkButton href="/tickets/new" variant="secondary" size="sm">
          Report an issue
        </LinkButton>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Pending", 0],
            ["Open", 0],
            ["In progress", 0],
            ["Resolved", 0],
          ] as const
        ).map(([label, count]) => (
          <NightStat key={label} label={label} value={count} />
        ))}
      </dl>

      <Panel lit>
        <PanelHeader
          eyebrow="Phase 2"
          title="Dashboard wires up next"
          description="Counts, ticket list, status updates, known-issue banners, and CSAT prompts come from /tickets/mine with MSW mocks."
        />
        <div className="p-6 sm:p-8">
          <EmptyState
            title="No tickets yet"
            description="Submit your first Sphere issue and it will land here with a live status."
            action={<LinkButton href="/tickets/new">Report an issue</LinkButton>}
          />
        </div>
      </Panel>
    </div>
  );
}
