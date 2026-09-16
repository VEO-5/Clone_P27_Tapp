import {
  ArrowDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Hourglass,
  LoaderCircle,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  PRIORITY_LABELS as CONTRACT_PRIORITY_LABELS,
  STATUS_LABELS as CONTRACT_STATUS_LABELS,
  type TicketPriority as ContractPriority,
  type TicketStatus as ContractStatus,
} from "@pearl27/contracts";
// Types: `@pearl27/contracts` is source of truth; `@/lib/types` is a legacy
// shim kept for older desk code. New code should use contracts only.
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type BadgeStatus = ContractStatus | TicketStatus;
export type BadgePriority = ContractPriority | TicketPriority;

const STATUS_LABELS_ALL: Record<string, string> = { ...STATUS_LABELS, ...CONTRACT_STATUS_LABELS };
const PRIORITY_LABELS_ALL: Record<string, string> = { ...PRIORITY_LABELS, ...CONTRACT_PRIORITY_LABELS };

// ---------------------------------------------------------------------------
// Centralized badge configuration.
// Add a status/priority here and every <StatusBadge>/<PriorityBadge> updates.
// Priority = tinted chip (how urgent?). Status = neutral chip, colored icon
// (what's happening?). The fill difference keeps the two distinguishable.
// ---------------------------------------------------------------------------

interface PriorityConfig {
  icon: LucideIcon;
  /** Paper surface: subtle severity tint, small radius, subtle border. */
  chip: string;
  night: string;
}

const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  urgent: {
    icon: CircleAlert,
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    night: "border-rose-400/40 bg-rose-400/15 text-rose-300",
  },
  high: {
    icon: TriangleAlert,
    chip: "border-orange-200 bg-orange-50 text-orange-700",
    night: "border-orange-400/40 bg-orange-400/15 text-orange-300",
  },
  medium: {
    icon: Circle,
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    night: "border-amber-400/40 bg-amber-400/15 text-amber-300",
  },
  low: {
    icon: ArrowDown,
    chip: "border-ink-600 bg-ink-900 text-mist",
    night: "border-cream/15 bg-night-deep text-haze",
  },
};

interface StatusConfig {
  icon: LucideIcon;
  iconClass: string;
  dotClass: string;
  night: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    icon: Hourglass,
    iconClass: "text-amber-600",
    dotClass: "bg-amber-500",
    night: "border-cream/15 bg-night-deep text-haze",
  },
  open: {
    icon: CircleDot,
    iconClass: "text-sky-600",
    dotClass: "bg-sky-500",
    night: "border-cream/20 bg-cream/10 text-cream",
  },
  in_progress: {
    icon: LoaderCircle,
    iconClass: "text-blue-600",
    dotClass: "bg-blue-500",
    night: "border-iris-400/40 bg-iris-500/15 text-iris-300",
  },
  resolved: {
    icon: CircleCheck,
    iconClass: "text-emerald-600",
    dotClass: "bg-emerald-500",
    night: "border-jade-400/40 bg-jade-400/15 text-jade-400",
  },
};

const SIZES = {
  sm: "h-6 gap-1.5 px-2 text-[11px]",
  md: "h-7 gap-1.5 px-2.5 text-xs",
} as const;

const ICON_SIZES = {
  sm: "size-3",
  md: "size-3.5",
} as const;

function BadgeShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[4px] border font-medium tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  size = "md",
  withIcon = true,
  className,
  surface = "paper",
}: {
  status: BadgeStatus;
  size?: keyof typeof SIZES;
  withIcon?: boolean;
  className?: string;
  surface?: "paper" | "night";
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.open!;
  const Icon = config.icon;

  return (
    <BadgeShell
      className={cn(
        SIZES[size],
        surface === "night" ? config.night : "border-ink-600 bg-white text-pearl",
        className,
      )}
    >
      {withIcon ? (
        <Icon className={cn(ICON_SIZES[size], surface === "night" ? undefined : config.iconClass)} aria-hidden />
      ) : (
        <span className={cn("size-1.5 rounded-full", config.dotClass)} aria-hidden />
      )}
      {STATUS_LABELS_ALL[status] ?? status}
    </BadgeShell>
  );
}

export function PriorityBadge({
  priority,
  size = "md",
  className,
  surface = "paper",
}: {
  priority: BadgePriority;
  size?: keyof typeof SIZES;
  className?: string;
  surface?: "paper" | "night";
}) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium!;
  const Icon = config.icon;

  return (
    <BadgeShell
      className={cn(SIZES[size], surface === "night" ? config.night : config.chip, className)}
    >
      <Icon className={ICON_SIZES[size]} aria-hidden />
      {PRIORITY_LABELS_ALL[priority] ?? priority}
    </BadgeShell>
  );
}

/** Standalone status icon (for dense contexts like tables that own their chip colors). */
export function StatusIcon({ status, className }: { status: BadgeStatus; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.open!;
  const Icon = config.icon;
  return <Icon className={cn("size-3.5", className)} aria-hidden />;
}

/** Standalone priority icon (for dense contexts like tables that own their chip colors). */
export function PriorityIcon({ priority, className }: { priority: BadgePriority; className?: string }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium!;
  const Icon = config.icon;
  return <Icon className={cn("size-3.5", className)} aria-hidden />;
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
