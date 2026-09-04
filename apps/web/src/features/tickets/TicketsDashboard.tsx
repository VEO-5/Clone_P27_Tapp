"use client";

import { useQuery } from "@tanstack/react-query";
import type { Ticket } from "@pearl27/contracts";
import { ArrowRight, Inbox } from "lucide-react";
import { useState } from "react";

import { TicketCard } from "@/components/TicketCard";
import { Button, LinkButton } from "@/components/ui/Button";
import { NightStat } from "@/components/ui/NightStat";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { CsatPrompt } from "@/features/tickets/CsatPrompt";
import { KnownIssueBanner } from "@/features/tickets/KnownIssueBanner";
import { apiFetch } from "@/lib/api";
import { formatRelative } from "@/lib/utils";

interface MyTicketsPage {
  items: Ticket[];
  nextCursor: string | null;
  counts: { pending: number; open: number; inProgress: number; resolved: number };
}

interface UpdateItem {
  ticketId: string;
  reference: string;
  title: string;
  message: string;
  createdAt: string;
}

/** Employee dashboard (EA §6.7): counts, list, updates feed, banners, CSAT. */
export default function TicketsDashboard() {
  const [pages, setPages] = useState<Ticket[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [dismissedCsat, setDismissedCsat] = useState<string[]>([]);

  const mine = useQuery({
    queryKey: ["tickets", "mine", cursor ?? "first"],
    queryFn: async () => {
      const page = await apiFetch<MyTicketsPage>(`/tickets/mine?limit=5${cursor ? `&cursor=${cursor}` : ""}`);
      setPages((prev) => [...prev, page.items]);
      return page;
    },
  });
  const updates = useQuery({
    queryKey: ["tickets", "mine", "updates"],
    queryFn: () => apiFetch<{ items: UpdateItem[] }>("/tickets/mine/updates?limit=5"),
  });
  const issues = useQuery({
    queryKey: ["known-issues"],
    queryFn: () => apiFetch<{ id: string; title: string; message: string }[]>("/known-issues"),
    staleTime: 60_000,
  });
  const unrated = useQuery({
    queryKey: ["tickets", "mine", "unrated"],
    queryFn: () => apiFetch<{ items: Ticket[] }>("/tickets/mine/unrated"),
  });

  const counts = mine.data?.counts ?? { pending: 0, open: 0, inProgress: 0, resolved: 0 };
  const items = pages.flat();
  const seen = new Set<string>();
  const deduped = items.filter((ticket) => (seen.has(ticket.id) ? false : (seen.add(ticket.id), true)));
  const csatTickets = (unrated.data?.items ?? []).filter((t) => !dismissedCsat.includes(t.id));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your inbox</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">My tickets</h1>
        </div>
        <LinkButton href="/tickets/new" variant="secondary" size="sm">
          Report an issue
          <ArrowRight className="size-3.5" aria-hidden />
        </LinkButton>
      </div>

      {issues.data?.[0] && (
        <div className="mb-6">
          <KnownIssueBanner issue={issues.data[0]} />
        </div>
      )}

      {mine.isPending ? (
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true" aria-label="Loading counts">
          {["Pending", "Open", "In progress", "Resolved"].map((label) => (
            <Skeleton key={label} className="h-20" />
          ))}
        </dl>
      ) : mine.isError ? (
        <Panel className="mb-6 p-6">
          <p role="alert" className="text-sm text-rose-400">
            Couldn&apos;t load your tickets.{" "}
            <button type="button" onClick={() => mine.refetch()} className="font-medium underline underline-offset-4">
              Retry
            </button>
          </p>
        </Panel>
      ) : (
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NightStat label="Pending" value={counts.pending} />
          <NightStat label="Open" value={counts.open} />
          <NightStat label="In progress" value={counts.inProgress} />
          <NightStat label="Resolved" value={counts.resolved} />
        </dl>
      )}

      {csatTickets.slice(0, 1).map((ticket) => (
        <div key={ticket.id} className="mb-6">
          <CsatPrompt ticket={ticket} onRated={() => setDismissedCsat((list) => [...list, ticket.id])} />
        </div>
      ))}

      {mine.data && deduped.length === 0 ? (
        <Panel tone="night">
          <EmptyState
            tone="night"
            icon={<Inbox className="size-5" aria-hidden />}
            title="No tickets yet"
            description="Submit a Sphere issue and it will land here with a live status."
            action={<LinkButton href="/tickets/new">Report an issue</LinkButton>}
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {deduped.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          {mine.data?.nextCursor && (
            <Button variant="secondary" onClick={() => setCursor(mine.data!.nextCursor)} disabled={mine.isFetching}>
              {mine.isFetching ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}

      <Panel className="mt-8">
        <PanelHeader eyebrow="Latest status updates" title="What changed" />
        <div className="flex flex-col gap-3 p-6">
          {updates.isPending && <Skeleton className="h-12 w-full" />}
          {updates.isError && <p className="text-sm text-fog">Updates are unavailable right now.</p>}
          {updates.data?.items.length === 0 && <p className="text-sm text-fog">No updates yet.</p>}
          {updates.data?.items.map((update) => (
            <div key={`${update.ticketId}-${update.createdAt}`} className="border-l-2 border-iris-400/60 pl-3">
              <p className="text-[13.5px] font-medium text-pearl">{update.message}</p>
              <p className="mt-0.5 text-[12.5px] text-fog">
                {update.reference} · {formatRelative(update.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
