"use client";

import { ArrowDown, ArrowUp, Lock, Mail, Minus } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import type { DeskTicket } from "@pearl27/contracts";

import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/shadcn/card";
import { StatusBadge } from "@/components/ui/Badge";
import { categoryName } from "@/features/tickets/categories";
import { cn } from "@/lib/utils";

function PriorityIcon({ priority }: { priority: DeskTicket["priority"] }) {
  const props = { className: "size-3", "aria-hidden": true } as const;
  if (priority === "urgent") return <ArrowUp {...props} className="size-3 text-rose-400" />;
  if (priority === "high") return <ArrowUp {...props} className="size-3 text-iris-600" />;
  if (priority === "medium") return <Minus {...props} className="size-3 text-mist" />;
  return <ArrowDown {...props} className="size-3 text-fog" />;
}

const CHANNEL_ICONS: ComponentType<{ className?: string }>[] = [Mail];

/** Compact reference-style ticket card: channel + priority, ref, title, avatar + SLA. */
export function TicketKanbanCard({ ticket }: { ticket: DeskTicket }) {
  const ChannelIcon = CHANNEL_ICONS[0]!;
  const displayName = ticket.assignee?.name ?? ticket.requesterName ?? "Employee";

  return (
    <Card
      className={cn(
        "gap-0 rounded-2xl border-ink-700 py-0 shadow-[0_1px_2px_rgba(27,42,74,0.06)]",
        "transition-all duration-200 hover:-translate-y-px hover:shadow-md",
     )}
    >
      <CardContent className="flex flex-col gap-2 px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-fog">
          <ChannelIcon className="size-4" aria-hidden />
          <PriorityIcon priority={ticket.priority} />
          <span className="ml-auto font-mono text-[11px] tabular-nums text-fog">
            #-{(ticket.reference.replace(/\D/g, "").slice(-3) || ticket.reference)}
          </span>
          {(ticket.unreadCount ?? 0) > 0 && (
            <span
              className="grid size-4 place-items-center rounded-full bg-iris-500 text-[9px] font-bold text-white"
              aria-label={`${ticket.unreadCount} unread`}
            >
              {ticket.unreadCount}
            </span>
          )}
        </div>

        <Link
          href={`/desk/tickets/${ticket.id}`}
          className="line-clamp-2 min-h-9 text-[13px] font-medium leading-snug tracking-tight text-pearl underline-offset-4 hover:underline"
          title={`${ticket.reference} · ${categoryName(ticket.categoryId)}`}
        >
          {ticket.title}
        </Link>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <UserAvatar
            name={displayName}
            className="size-5"
            fallbackClassName="bg-ink-900 text-[8px] font-semibold text-mist"
          />
          <span className="min-w-0 flex-1 truncate text-[11px] text-fog">{displayName}</span>
          {ticket.lock?.lockedByOther && (
            <Lock className="size-3 shrink-0 text-fog" aria-label={`Locked by ${ticket.lock.ownerName ?? "another agent"}`} />
          )}
          <StatusBadge status={ticket.status} size="sm" />
        </div>
      </CardContent>
    </Card>
  );
}
