// @ts-nocheck
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Assignee, Attachment, DeskTicket, Message, TicketEvent } from "@pearl27/contracts";
import { ArrowLeft, Lock, SearchX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AttachmentList } from "@/features/tickets/AttachmentList";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/shadcn/button";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useCategoryName } from "@/features/tickets/categories";
import { useSession } from "@/features/auth/useSession";
import { apiFetch, ApiError } from "@/lib/api";
import { config } from "@/lib/config";
import { useDeskEvents } from "@/lib/sse";
import { formatDateTime, formatRelative } from "@/lib/utils";

import { ClaimButton } from "./ClaimButton";
import { Composer, type SendOutcome } from "./Composer";
import { ConversationStream, PresenceBar } from "./ConversationStream";
import { AssignDialog, ReleaseDialog } from "./OwnershipDialogs";
import { invalidateDesk, ownershipRules } from "./ownership";
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
  // Hook first (before the early returns below): "" resolves to "" and is
  // discarded on the loading/error branches.
  // Defensive: API was flat {...ticket, events} vs Detail {ticket, events} — support both.
  const rawCategoryId =
    (detail.data as unknown as { ticket?: { categoryId?: string }; categoryId?: string } | null)?.ticket?.categoryId ??
    (detail.data as unknown as { categoryId?: string } | null)?.categoryId ??
    "";
  const resolvedCategoryName = useCategoryName(rawCategoryId);

  if (detail.isPending) {
    return (
      <div className="pb-2" aria-busy="true" aria-label="Loading ticket">
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
              <Button variant="ghost" asChild>
                <Link to="/desk/queue">Back to the queue</Link>
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  // Normalize: support wrapped Detail {ticket} (mock + fixed prod) and legacy flat prod.
  const rawDetail = detail.data as unknown as Detail & Record<string, unknown>;
  const ticket = (rawDetail as unknown as { ticket?: DeskTicket })?.ticket ?? (rawDetail as unknown as DeskTicket);
  const events = (rawDetail as unknown as { events?: TicketEvent[] })?.events ?? [];
  const messages = (rawDetail as unknown as { messages?: Message[] })?.messages ?? [];
  const attachments = (rawDetail as unknown as { attachments?: Attachment[] })?.attachments ?? [];

  if (!ticket || !ticket.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <Panel tone="night">
          <EmptyState
            tone="night"
            icon={<SearchX className="size-5" aria-hidden />}
            title="Ticket not found"
            description="It may have been removed, or the link is stale."
            action={
              <Button variant="ghost" asChild>
                <Link to="/desk/queue">Back to the queue</Link>
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  const role = session.data?.role === "admin" ? "admin" : "agent";
  const { lockedByOther, canClaim, canRelease, canAssign, isTerminal, mine } = ownershipRules(ticket, role);
  // Agents see a read-only banner on others' tickets; admins always work.
  // Resolved is terminal for everyone: read-only until status reopens.
  const readOnly = (lockedByOther && role === "agent") || isTerminal;
  const showComposer = !readOnly;
  const lockOwner = lockedByOther ? (ticket.lock?.ownerName ?? "another agent") : null;
  const effectiveLockedOwner = isTerminal ? null : (lockedOwner ?? (readOnly ? lockOwner : null));
  const unassigned = !ticket.assignee;
  const pendingNotOpened = !isTerminal && ticket.status === "pending" && mine;
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
    void invalidateDesk(queryClient);
  }

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] flex-col overflow-hidden pb-2">
      <div className="mb-4 shrink-0">
        <Button variant="ghost" size="sm" className="-ml-3" asChild>
          <Link to="/desk/queue">
            <ArrowLeft className="size-3.5" aria-hidden /> Back to queue
          </Link>
        </Button>
      </div>

      {ticket.previousRelease && (
        <div className="mb-4 shrink-0 rounded-[4px] border border-l-2 border-gold-400/30 border-l-gold-400 bg-gold-400/10 p-4" role="status">
          <PreviousReleaseMarker ticket={ticket} />
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto no-scrollbar lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:overflow-visible">
        <Panel lit className="lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:no-scrollbar">
          <PanelHeader
            eyebrow={ticket.reference}
            title={ticket.title}
            description={`${ticket.requesterName ?? "Employee"}${ticket.requesterEmail ? ` · ${ticket.requesterEmail}` : ""} · ${resolvedCategoryName} · Submitted ${formatDateTime(ticket.createdAt)}`}
            className="lg:sticky lg:top-0 lg:z-10 lg:rounded-t-[4px] lg:bg-white"
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
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-pearl-dim break-words">{ticket.description}</p>
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

        <div className="min-h-0 lg:overflow-y-auto lg:no-scrollbar">
        <Panel tone="night" lit className="p-6">
          <p className="eyebrow mb-2">Work this ticket</p>
          {isTerminal && (
            <p className="mb-3 rounded-[2px] bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-300" role="status">
              Resolved — read only. Change status to Open to rework it.
            </p>
          )}
          {pendingNotOpened && (
            <p className="mb-3 rounded-[2px] bg-gold-400/10 px-3 py-2 text-[13px] text-gold-300" role="status">
              Assigned to you · Pending — opening this ticket marks it Open.
            </p>
          )}
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
              {/* Same card-action pattern as QueueRow: all actions docked right.
                  Resolved never acts; pending/open/in_progress follow the hook. */}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-cream/10 pt-4">
                {canClaim && <ClaimButton ticket={ticket} />}
                {canAssign && <AssignDialog ticket={ticket} agents={agents} />}
                {canRelease && <ReleaseDialog ticket={ticket} />}
              </div>
            </div>
          )}
          <p className="mt-4 text-[12px] text-haze">
            Updated {formatRelative(ticket.updatedAt)} · version {ticket.version}
          </p>
        </Panel>
        </div>
      </div>
    </div>
  );
}
