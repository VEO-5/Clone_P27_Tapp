import { Inbox, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { EmployeeSignOutButton } from "@/components/EmployeeSignOutButton";
import { TicketCard } from "@/components/TicketCard";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { getEmployeeSession } from "@/lib/employeeAuth";
import { getRepository } from "@/lib/repo";
import { computeStats } from "@/lib/repo/types";
import type { Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My tickets",
};

export default async function MyTicketsPage() {
  const session = await getEmployeeSession();
  if (!session) redirect("/my-tickets/login");

  let tickets: Ticket[] = [];
  try {
    tickets = await getRepository().listTicketsByEmail(session.email);
  } catch (error) {
    console.error("[my-tickets]", error);
  }
  const stats = computeStats(tickets);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your inbox</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">My tickets</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            Signed in as <span className="font-medium text-pearl">{session.email}</span>. Come back
            any time — this page stays open on this device for 30 days.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/" variant="secondary" size="sm" icon={<Plus className="size-3.5" />}>
            New ticket
          </LinkButton>
          <EmployeeSignOutButton />
        </div>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Open", stats.open],
            ["In progress", stats.inProgress],
            ["Resolved", stats.resolved],
            ["Closed", stats.closed],
          ] as const
        ).map(([label, count]) => (
          <div key={label} className="rounded-2xl border border-ink-700 bg-ink-850/70 px-4 py-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-fog">{label}</dt>
            <dd className="mt-1 font-display text-2xl text-pearl">{count}</dd>
          </div>
        ))}
      </dl>

      {tickets.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Inbox className="size-5" aria-hidden />}
            title="No tickets on this email yet"
            description="Submit a Sphere issue and it will land here with a live status. You can also look one up by its PRL- reference."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <LinkButton href="/">Submit a ticket</LinkButton>
                <LinkButton href="/track" variant="secondary">
                  Lookup by reference
                </LinkButton>
              </div>
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} href={`/track/${ticket.reference}`} />
          ))}
        </div>
      )}
    </div>
  );
}
