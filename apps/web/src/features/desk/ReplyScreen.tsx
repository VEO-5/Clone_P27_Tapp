"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Assignee, Attachment, DeskTicket, Message, TicketEvent } from "@pearl27/contracts";
import { ArrowLeft, Lock, SearchX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AttachmentList } from "@/components/AttachmentList";
import { CopyButton } from "@/components/CopyButton";
import { LinkButton } from "@/components/ui/Button";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { categoryName } from "@/components/TicketCard";
import { useSession } from "@/features/auth/useSession";
import { apiFetch, ApiError } from "@/lib/api";
import { config } from "@/lib/config";
import { useDeskEvents } from "@/lib/sse";
import { formatDateTime, formatRelative } from "@/lib/utils";

import { ClaimButton } from "./ClaimButton";
import { Composer, type SendOutcome } from "./Composer";
import { ConversationStream, PresenceBar } from "./ConversationStream";
import { AssignDialog, ReleaseDialog } from "./OwnershipDialogs";
import { PreviousReleaseMarker, SlaBadge } from "./RowBadges";

interface Detail {
  ticket: DeskTicket;
  events: TicketEvent[];
  messages: Message[];
  attachments: Attachment[];
  justOpened: boolean;
}

function detailKey(id: string) {
  return ["desk", "ticket", id];
}

/** The single screen where agents work a ticket (EA §6.11 outcomes as the API reports them). */
export function ReplyScreen({ id }: { id: string }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState(false);
  const [lockedOwner, setLockedOwner] = useState<string | null>(null);
  const toastedOpened = useRef(new Set<string>());
  const { presence } = useDeskEvents(true);

  const detail = useQuery<Detail, ApiError>({
    queryKey: detailKey(id),
    queryFn: () => apiFetch<Detail>(`/desk/tickets/${id}`),
    retry: false,
  });

  // One-time "now Open" toast on the assignee's first fetch.
  useEffect(() => {
    if (detail.data?.justOpened && !toastedOpened.current.has(id)) {
      toastedOpened.current.add(id);
      toast.success("Ticket is now Open");
    }
  }, [detail.data, id]);

  // "I am viewing" heartbeat every 30s while mounted.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const beat = () => {
      fetch(`${config.apiUrl}/desk/tickets/${id}/presence`, { method: "POST", credentials: "include" }).catch(() => undefined);
    };
    beat();
    timer = setInterval(beat, 30_000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [id]);

  const agentsQuery = useQuery({
    queryKey: ["desk", "agents"],
    queryFn: () => apiFetch<Assignee[]>("/desk/agents"),
    staleTime: 300_000,
  });

  if (detail.isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6" aria-busy="true" aria-label="Loading ticket">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-96 w-full" />
      </div>
    );
  }

  if (detail.isError) {
    const notFound = detail.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <Panel tone="night">
          <EmptyState
            tone="night"
            icon={<SearchX className="size-5" aria-hidden />}
            title={notFound ? "Ticket not found" : "Couldn't load this ticket"}
            description={notFound ? "It may have been removed, or the link is stale." : "Try again in a moment."}
            action={
              <LinkButton href="/desk/queue" variant="night">
                Back to the queue
              </LinkButton>
            }
          />
        </Panel>
      </div>
    );
  }

  const { ticket, events, messages, attachments } = detail.data;
  const role = session.data?.role === "admin" ? "admin" : "agent";
  const lockedByOther = ticket.lock?.lockedByOther ?? false;
  // Agents see a read-only banner on others' tickets; admins always work.
  const readOnly = lockedByOther && role === "agent";
  const showComposer = !readOnly;
  const lockOwner = lockedByOther ? (ticket.lock?.ownerName ?? "another agent") : null;
  const effectiveLockedOwner = lockedOwner ?? (readOnly ? lockOwner : null);
  const unassigned = !ticket.assignee;
  const agents = agentsQuery.data ?? [];
  const viewers = presence?.ticketId === id ? presence.viewers : [];
  const me = session.data?.name ?? "";

  function applyDetail(next: SendOutcome) {
    queryClient.setQueryData(detailKey(id), {
      ticket: next.ticket,
      events: next.events,
      messages: next.messages,
      attachments: next.attachments,
      justOpened: false,
    });
    setConflict(false);
    void queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <LinkButton href="/desk/queue" variant="ghost" size="sm" className="-ml-3 mb-6">
        <ArrowLeft className="size-3.5" aria-hidden /> Back to queue
      </LinkButton>

      {ticket.previousRelease && (
        <div className="mb-4 rounded-[4px] border border-l-2 border-gold-400/30 border-l-gold-400 bg-gold-400/10 p-4" role="status">
          <PreviousReleaseMarker ticket={ticket} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel lit>
          <PanelHeader
            eyebrow={ticket.reference}
            title={ticket.title}
            description={`${ticket.requesterName ?? "Employee"} · ${categoryName(ticket.categoryId)} · Submitted ${formatDateTime(ticket.createdAt)}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
            }
          />
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <section className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-mist">
              <span>
                Assignee:{" "}
                <strong className="text-pearl">{ticket.assignee ? ticket.assignee.name : "Unassigned"}</strong>
              </span>
              {ticket.sla?.dueAt && (
                <span>
                  SLA due {formatDateTime(ticket.sla.dueAt)} <SlaBadge ticket={ticket} />
                </span>
              )}
              <CopyButton value={ticket.reference} label="Copy reference" />
            </section>

            <section>
              <p className="eyebrow mb-3">Description</p>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-pearl-dim">{ticket.description}</p>
            </section>

            <section>
              <p className="eyebrow mb-3">Attachments</p>
              <AttachmentList attachments={attachments} />
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="eyebrow">Conversation</p>
                <PresenceBar viewers={viewers} me={me} />
              </div>
              <ConversationStream messages={messages} events={events} />
            </section>
          </div>
        </Panel>

        <Panel tone="night" lit className="p-6 lg:sticky lg:top-24">
          <p className="eyebrow mb-2">Work this ticket</p>
          {conflict && (
            <p role="alert" className="mb-3 rounded-[2px] bg-gold-400/10 px-3 py-2 text-[13px] text-gold-400">
              This ticket changed while you were typing — review the latest and send again. Your draft is kept.
            </p>
          )}
          {!showComposer && effectiveLockedOwner && (
            <div className="rounded-[2px] border border-ink-600 bg-night-deep p-4" role="note">
              <p className="flex items-center gap-2 text-[14px] font-medium text-cream">
                <Lock className="size-4" aria-hidden />
                Locked to {effectiveLockedOwner} · view only
              </p>
              <p className="mt-1 text-[13px] text-haze">
                You can read the whole stream, but only {effectiveLockedOwner} (or an admin) can reply.
              </p>
            </div>
          )}
          {showComposer && (
            <div className="flex flex-col gap-4">
              {role === "admin" && lockOwner && (
                <p className="rounded-[2px] bg-ink-700/60 px-3 py-2 text-[12.5px] text-haze" role="note">
                  Locked to {lockOwner} — admin override active.
                </p>
              )}
              <Composer
                key={ticket.id}
                ticketId={ticket.id}
                version={ticket.version}
                willAutoClaim={unassigned}
                onSent={(next) => {
                  applyDetail(next);
                  toast.success("Sent");
                }}
                onConflict={(next) => {
                  if (next) applyDetail(next);
                  else void queryClient.invalidateQueries({ queryKey: detailKey(id) });
                  setConflict(true);
                }}
                onLocked={(owner) => setLockedOwner(owner)}
              />
              <div className="flex flex-wrap gap-2 border-t border-cream/10 pt-4">
                {unassigned && <ClaimButton ticket={ticket} />}
                {!unassigned && (!lockedByOther || role === "admin") && <ReleaseDialog ticket={ticket} />}
                {role === "admin" && <AssignDialog ticket={ticket} agents={agents} />}
              </div>
            </div>
          )}
          <p className="mt-4 text-[12px] text-haze">
            Updated {formatRelative(ticket.updatedAt)} · version {ticket.version}
          </p>
        </Panel>
      </div>
    </div>
  );
}
