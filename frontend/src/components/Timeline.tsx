import { ArrowRightLeft, Flag, MessageSquare, Sparkles } from "lucide-react";

import type { TicketActor, TicketEvent, TicketEventType } from "@/lib/types";
import { cn, formatDateTime, initials } from "@/lib/utils";

const ACTOR_LABELS: Record<TicketActor, string> = {
  employee: "You",
  support: "Support",
  system: "System",
};

const EVENT_ICONS: Record<TicketEventType, typeof Sparkles> = {
  created: Sparkles,
  status_changed: ArrowRightLeft,
  priority_changed: Flag,
  reply: MessageSquare,
};

export function Timeline({
  events,
  className,
  viewer = "employee",
}: {
  events: TicketEvent[];
  className?: string;
  viewer?: "employee" | "support";
}) {
  const ordered = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-fog">No updates yet — support will appear here.</p>
    );
  }

  return (
    <ol className={cn("flex flex-col", className)} aria-label="Ticket timeline">
      {ordered.map((event, index) => {
        const Icon = EVENT_ICONS[event.type];
        const isReply = event.type === "reply";
        const actorLabel =
          event.actor === "employee" && viewer === "support"
            ? "Employee"
            : ACTOR_LABELS[event.actor];

        return (
          <li key={event.id} className="flex gap-4">
            <span className="relative flex flex-col items-center">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl border",
                  event.actor === "support"
                    ? "border-iris-400/30 bg-iris-500/10 text-iris-300"
                    : "border-ink-600 bg-ink-800/80 text-mist",
                )}
              >
                {isReply ? (
                  <span className="text-[10px] font-semibold tracking-wide">
                    {initials(actorLabel)}
                  </span>
                ) : (
                  <Icon className="size-3.5" aria-hidden />
                )}
              </span>
              {index < ordered.length - 1 && (
                <span className="mt-2 w-px flex-1 bg-gradient-to-b from-ink-600 to-transparent" />
              )}
            </span>

            <div className={cn("min-w-0 flex-1", index < ordered.length - 1 && "pb-6")}>
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[13px] font-semibold text-pearl">{actorLabel}</span>
                <time
                  dateTime={event.createdAt}
                  className="text-[11.5px] text-fog"
                >
                  {formatDateTime(event.createdAt)}
                </time>
              </p>
              <p
                className={cn(
                  "mt-1 text-[13.5px] leading-relaxed",
                  isReply
                    ? "rounded-xl border border-ink-700 bg-ink-800/50 px-3.5 py-3 text-pearl-dim"
                    : "text-mist",
                )}
              >
                {event.message}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
