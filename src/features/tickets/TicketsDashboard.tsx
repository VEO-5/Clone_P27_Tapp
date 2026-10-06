"use client";

import { useQuery } from "@tanstack/react-query";
import type { Ticket } from "@pearl27/contracts";
import { ArrowRight, Inbox } from "lucide-react";
import { useState } from "react";

import { TicketCard } from "@/features/tickets/TicketCard";
import { ReportIssueSheet } from "@/features/tickets/ReportIssueSheet";
import { Button } from "@/components/shadcn/button";
import { NightStat } from "@/components/ui/NightStat";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { CsatPopup, isCsatSnoozed } from "@/features/tickets/CsatPopup";
import { KnownIssueBanner } from "@/features/tickets/KnownIssueBanner";
import { useSession } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";

interface MyTicketsPage {
  items: Ticket[];
  nextCursor: string | null;
  counts: { pending: number; open: number; inProgress: number; resolved: number };
}

/** Employee dashboard (EA §6.7): counts, list, banners, CSAT. */
export default function TicketsDashboard() {
  const [pages, setPages] = useState<Ticket[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [dismissedCsat, setDismissedCsat] = useState<string[]>([]);
  const [dismissedDemotion, setDismissedDemotion] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const session = useSession();

  const mine = useQuery({
    queryKey: ["tickets", "mine", cursor ?? "first"],
    queryFn: async () => {
      const page = await apiFetch<MyTicketsPage>(`/tickets/mine?limit=5${cursor ? `&cursor=${cursor}` : ""}`);
      setPages((prev) => [...prev, page.items]);
      return page;
    },
  });
  const issues = useQuery({
    queryKey: ["known-issues"],
    queryFn: () => apiFetch<{ id: string; title: string; message: string }[]>("/known-issues"),
    staleTime: 60_000,
  });
  const unrated = useQuery({
    queryKey: ["tickets", "mine", "unrated"],
    queryFn: () => apiFetch<{ items: Ticket[] }>("/tickets/mine/unrated"),
    retry: false,
  });

  // A card can never go blank: any missing key renders 0. (Loading state is
  // covered by the skeleton block below, so 0 always means "none".)
  const rawCounts = mine.data?.counts;
  const counts = {
    pending: rawCounts?.pending ?? 0,
    open: rawCounts?.open ?? 0,
    inProgress: rawCounts?.inProgress ?? 0,
    resolved: rawCounts?.resolved ?? 0,
  };
  // Employee-only declutter: the header nav already carries "Submit a ticket",
  // so the hero button is hidden for employees. Other roles keep it — admins
  // have no header entry point. Hidden while the session is pending so the
  // button never flashes in and out on refresh.
  const showHeroCta = !session.isPending && session.data?.role !== "employee";
  const items = pages.flat();
  const seen = new Set<string>();
  const deduped = items.filter((ticket) => (seen.has(ticket.id) ? false : (seen.add(ticket.id), true)));
  // Fly-in candidates: unrated, not dismissed this session, not snoozed
  // recently. Oldest first, max one popup per session (parent renders one).
  const csatTickets = (unrated.data?.items ?? []).filter(
    (t) => !dismissedCsat.includes(t.id) && !isCsatSnoozed(t.id),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your inbox</p>
          {/* Page title lives in the header bar now — kept screen-reader-only
              so the page retains its single h1 without doubling the visual. */}
          <h1 className="sr-only">My tickets</h1>
        </div>
        {showHeroCta && (
          <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
            Submit a ticket
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        )}
        <ReportIssueSheet open={reportOpen} onOpenChange={setReportOpen} />
      </div>

      {session.data?.demoted && !dismissedDemotion && (
        <div className="mb-6">
          <Panel className="border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13.5px] leading-relaxed text-amber-800">
                Your desk access was removed by an admin — you&apos;re signed in as an employee.
                Your tickets and history are untouched.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setDismissedDemotion(true)}>
                Dismiss
              </Button>
            </div>
          </Panel>
        </div>
      )}

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
        <CsatPopup
          key={ticket.id}
          ticket={ticket}
          onDone={() => {
            setDismissedCsat((list) => [...list, ticket.id]);
            void unrated.refetch();
          }}
        />
      ))}

      {mine.data && deduped.length === 0 ? (
        <Panel tone="night">
          <EmptyState
            tone="night"
            icon={<Inbox className="size-5" aria-hidden />}
            title="No tickets yet"
            description="Submit a ticket and it will land here with a live status."
            action={
              <Button onClick={() => setReportOpen(true)}>
                Submit a ticket
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {deduped.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          {mine.data?.nextCursor && (
            <Button variant="outline" onClick={() => setCursor(mine.data!.nextCursor)} disabled={mine.isFetching}>
              {mine.isFetching ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
