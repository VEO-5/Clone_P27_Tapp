"use client";

import { useQuery } from "@tanstack/react-query";
import type { Attachment, Ticket, TicketEvent } from "@pearl27/contracts";
import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { AttachmentList } from "@/features/tickets/AttachmentList";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/shadcn/button";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { CsatPrompt } from "@/features/tickets/CsatPrompt";
import { StatusTimeline } from "@/features/tickets/StatusTimeline";
import { categoryName } from "@/features/tickets/categories";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface Detail extends Ticket {
  events: TicketEvent[];
  attachments: Attachment[];
}

/** Employee ticket page: status record only. No composer, no messages. */
export function TicketDetail({ reference }: { reference: string }) {
  const detail = useQuery<Detail, ApiError>({
    queryKey: ["tickets", reference],
    queryFn: () => apiFetch<Detail>(`/tickets/${reference}`),
    retry: false,
  });
  const unrated = useQuery({
    queryKey: ["tickets", "mine", "unrated"],
    queryFn: () => apiFetch<{ items: Ticket[] }>("/tickets/mine/unrated"),
  });

  if (detail.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14" aria-busy="true" aria-label="Loading ticket">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (detail.isError) {
    const status = detail.error instanceof ApiError ? detail.error.status : 500;
    const notFound = status === 404;
    const forbidden = status === 403;
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <Panel tone="night">
          <EmptyState
            tone="night"
            icon={<SearchX className="size-5" aria-hidden />}
            title={notFound ? "No ticket found" : forbidden ? "Not your ticket" : "Couldn't load this ticket"}
            description={
              notFound
                ? `Nothing matches ${reference}. Check the code on your confirmation.`
                : forbidden
                  ? "You can't open another employee's ticket. Back to your inbox."
                  : "Try again in a moment."
            }
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                {notFound || forbidden ? (
                  <Button variant="ghost" asChild>
                    <Link href="/tickets">Back to My tickets</Link>
                  </Button>
                ) : (
                  <Button type="button" onClick={() => detail.refetch()}>
                    Retry
                  </Button>
                )}
              </div>
            }
          />
        </Panel>
      </div>
    );
  }

  const ticket = detail.data;
  const showCsat = unrated.data?.items.some((t) => t.id === ticket.id) ?? false;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <Button variant="ghost" size="sm" className="-ml-3 mb-6" asChild>
        <Link href="/tickets">
          <ArrowLeft className="size-3.5" aria-hidden /> Back to My tickets
        </Link>
      </Button>

      <Panel lit>
        <PanelHeader
          eyebrow="Ticket"
          title={ticket.title}
          description={`${categoryName(ticket.categoryId)} · Submitted ${formatDateTime(ticket.createdAt)}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          }
        />

        <div className="grid gap-px border-b border-ink-700/70 bg-ink-700 sm:grid-cols-3">
          {[
            { label: "Reference", value: ticket.reference, mono: true },
            {
              label: "Handling agent",
              value: ticket.handlingAgent ? ticket.handlingAgent.name : "Waiting for an agent",
            },
            { label: "Submitted", value: formatDateTime(ticket.createdAt) },
          ].map((row) => (
            <div key={row.label} className="bg-ink-850 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-fog">{row.label}</p>
              <p className={`mt-1.5 text-[13.5px] font-medium text-pearl ${row.mono ? "mono-ref" : ""}`}>
                {row.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-8 p-6 sm:p-8">
          <section>
            <p className="eyebrow mb-3">Description</p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-pearl-dim break-words">
              {ticket.description}
            </p>
            <div className="mt-4">
              <CopyButton value={ticket.reference} label="Copy reference" />
            </div>
          </section>

          <section>
            <p className="eyebrow mb-3">Attachments</p>
            <AttachmentList attachments={ticket.attachments} />
          </section>

          <section>
            <p className="eyebrow mb-4">Updates</p>
            <StatusTimeline events={ticket.events} />
          </section>

          {showCsat && (
            <section aria-label="Rate this ticket">
              <CsatPrompt ticket={ticket} onRated={() => unrated.refetch()} />
            </section>
          )}
        </div>
      </Panel>
    </div>
  );
}
