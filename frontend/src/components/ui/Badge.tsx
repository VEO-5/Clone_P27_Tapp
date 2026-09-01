import { CheckCircle2, CircleDot, Clock, Lock } from "lucide-react";
import type { ReactNode } from "react";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<TicketStatus, { chip: string; dot: string; icon: ReactNode }> = {
  open: {
    chip: "border-aqua-400/25 bg-aqua-400/10 text-aqua-400",
    dot: "bg-aqua-400",
    icon: <CircleDot className="size-3.5" aria-hidden />,
  },
  in_progress: {
    chip: "border-gold-400/25 bg-gold-400/10 text-gold-400",
    dot: "bg-gold-400",
    icon: <Clock className="size-3.5" aria-hidden />,
  },
  resolved: {
    chip: "border-jade-400/25 bg-jade-400/10 text-jade-400",
    dot: "bg-jade-400",
    icon: <CheckCircle2 className="size-3.5" aria-hidden />,
  },
  closed: {
    chip: "border-ink-500/60 bg-ink-700/50 text-mist",
    dot: "bg-fog",
    icon: <Lock className="size-3.5" aria-hidden />,
  },
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "border-ink-500/60 bg-ink-700/40 text-mist",
  medium: "border-iris-400/25 bg-iris-400/10 text-iris-300",
  high: "border-gold-400/25 bg-gold-400/10 text-gold-400",
  urgent: "border-rose-400/30 bg-rose-400/12 text-rose-400",
};

const SIZES = {
  sm: "h-6 gap-1.5 px-2.5 text-[11px]",
  md: "h-7 gap-2 px-3 text-xs",
} as const;

export function StatusBadge({
  status,
  size = "md",
  withIcon = true,
  className,
}: {
  status: TicketStatus;
  size?: keyof typeof SIZES;
  withIcon?: boolean;
  className?: string;
}) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tracking-wide",
        style.chip,
        SIZES[size],
        className,
      )}
    >
      {withIcon ? (
        style.icon
      ) : (
        <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  size = "md",
  className,
}: {
  priority: TicketPriority;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tracking-wide",
        PRIORITY_STYLES[priority],
        SIZES[size],
        className,
      )}
    >
      {priority === "urgent" && (
        <span className="size-1.5 animate-pulse rounded-full bg-rose-400" aria-hidden />
      )}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

/** Neutral chip for categories, counts, and metadata. */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full border border-ink-600 bg-ink-800/60 px-3 text-xs text-mist",
        className,
      )}
    >
      {children}
    </span>
  );
}
