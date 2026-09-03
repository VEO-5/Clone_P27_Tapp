"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CircleDot,
  Clock,
  Folder,
  Inbox,
  Loader,
  Minus,
  Ticket as TicketIcon,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import {
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY = 24 * 60 * 60 * 1000;

/** Past due = still actionable and aging: urgent > 24h, everything else > 72h. */
export function isOverdue(ticket: Ticket, now = Date.now()): boolean {
  if (ticket.status !== "open" && ticket.status !== "in_progress") return false;
  const age = now - new Date(ticket.createdAt).getTime();
  return age > (ticket.priority === "urgent" ? DAY : 3 * DAY);
}

function Row({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  iconClassName,
  collapsed,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  iconClassName?: string;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <CollapsedTip label={label} count={count}>
        <button
          type="button"
          onClick={onClick}
          aria-label={count !== undefined ? `${label}, ${count} tickets` : label}
          aria-current={active ? "true" : undefined}
          className={cn(
            "relative rounded-lg p-2.5 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40",
            active ? "bg-ink-900 text-pearl" : "text-fog hover:bg-ink-900/60 hover:text-pearl",
          )}
        >
          <Icon className={cn("size-4", active && "text-pearl", iconClassName)} />
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                "absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full px-0.5 text-center text-[9px] font-semibold tabular-nums",
                active ? "bg-iris-500 text-white" : "bg-ink-900 text-mist",
              )}
            >
              {count}
            </span>
          )}
        </button>
      </CollapsedTip>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40",
        active ? "bg-ink-900 font-semibold text-pearl" : "text-mist hover:bg-ink-900/60 hover:text-pearl",
      )}
    >
      <Icon className={cn("size-3.5 shrink-0 text-fog", active && "text-pearl", iconClassName)} />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs tabular-nums",
            active ? "bg-white font-semibold text-pearl" : "bg-ink-900/70 text-fog",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Section({ title, children, collapsed, bare }: { title: string; children: React.ReactNode; collapsed?: boolean; bare?: boolean }) {
  if (bare) {
    return <div className="flex flex-col gap-0.5">{children}</div>;
  }
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-ink-700/70 pt-3 first:border-t-0 first:pt-0">
        {children}
      </div>
    );
  }
  return (
    <section>
      <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-fog">{title}</h2>
      <div className="mt-2 flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

/**
 * Hover label for collapsed-rail icons. Rendered `fixed` from the trigger's
 * bounding rect so the rail's `overflow-x-hidden` can never clip it.
 */
function CollapsedTip({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  const show = (event: React.SyntheticEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  };

  return (
    <div
      className="flex justify-center"
      onMouseEnter={show}
      onMouseLeave={() => setAnchor(null)}
      onFocus={show}
      onBlur={() => setAnchor(null)}
    >
      {children}
      {anchor && (
        <span
          role="tooltip"
          style={{ top: anchor.top, left: anchor.left }}
          className="fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-md border border-ink-700 bg-night px-2 py-1 text-xs font-medium text-cream shadow-lg"
        >
          {label}
          {count !== undefined && <span className="ml-1.5 text-haze">({count})</span>}
        </span>
      )}
    </div>
  );
}

const PRIORITY_META: { value: TicketPriority; icon: ComponentType<{ className?: string }>; iconClassName: string }[] = [
  { value: "urgent", icon: ArrowUp, iconClassName: "text-rose-400" },
  { value: "high", icon: ArrowUp, iconClassName: "text-iris-600" },
  { value: "medium", icon: Minus, iconClassName: "text-aqua-500" },
  { value: "low", icon: ArrowDown, iconClassName: "text-fog" },
];

export interface SidebarSelection {
  status: TicketStatus | "all";
  priority: TicketPriority | "all";
  category: TicketCategory | "all";
  overdue: boolean;
}

export function DeskSidebar({
  tickets,
  selection,
  onSelect,
  collapsed,
  viewsTitleAtTop,
}: {
  tickets: Ticket[];
  selection: SidebarSelection;
  onSelect: (next: Partial<SidebarSelection> & { resetView?: boolean }) => void;
  collapsed?: boolean;
  /** When true, the Views section renders without its own title (shown in the rail header instead). */
  viewsTitleAtTop?: boolean;
}) {
  // Snapshot once per mount — the queue refreshes from the server on every
  // filter change, so counts stay fresh without re-reading the clock.
  const [now] = useState(() => Date.now());
  const counts = useMemo(() => {
    const countBy = (fn: (t: Ticket) => boolean) => tickets.filter(fn).length;
    const byCategory = {} as Record<TicketCategory, number>;
    for (const category of TICKET_CATEGORIES) byCategory[category] = countBy((t) => t.category === category);
    const byPriority = {} as Record<TicketPriority, number>;
    for (const priority of TICKET_PRIORITIES) byPriority[priority] = countBy((t) => t.priority === priority);
    return {
      total: tickets.length,
      open: countBy((t) => t.status === "open"),
      pending: countBy((t) => t.status === "in_progress"),
      resolved: countBy((t) => t.status === "resolved"),
      overdue: tickets.filter((t) => isOverdue(t, now)).length,
      byCategory,
      byPriority,
    };
  }, [tickets, now]);

  const viewingAll =
    !selection.overdue &&
    selection.status === "all" &&
    selection.priority === "all" &&
    selection.category === "all";

  return (
    <div className={cn("flex flex-col", collapsed ? "items-center gap-4" : "gap-6")}>
      <Section title="Views" collapsed={collapsed || viewsTitleAtTop} bare={viewsTitleAtTop && !collapsed}>
        <Row
          icon={TicketIcon}
          label="All Tickets"
          count={counts.total}
          active={viewingAll}
          collapsed={collapsed}
          onClick={() => onSelect({ status: "all", priority: "all", category: "all", overdue: false })}
        />
        <Row
          icon={CircleDot}
          label="Open"
          count={counts.open}
          active={!selection.overdue && selection.status === "open"}
          collapsed={collapsed}
          onClick={() => onSelect({ status: "open", overdue: false })}
        />
        <Row
          icon={Loader}
          label="Pending"
          count={counts.pending}
          active={!selection.overdue && selection.status === "in_progress"}
          collapsed={collapsed}
          onClick={() => onSelect({ status: "in_progress", overdue: false })}
        />
        <Row
          icon={AlertCircle}
          label="Past Due"
          count={counts.overdue}
          active={selection.overdue}
          collapsed={collapsed}
          onClick={() => onSelect({ overdue: true })}
          iconClassName="text-gold-400"
        />
        <Row
          icon={Check}
          label="Resolved"
          count={counts.resolved}
          active={!selection.overdue && selection.status === "resolved"}
          collapsed={collapsed}
          onClick={() => onSelect({ status: "resolved", overdue: false })}
        />
      </Section>

      <Section title="Categories" collapsed={collapsed}>
        {TICKET_CATEGORIES.filter(
          (category) => category !== "hardware" && category !== "network" && category !== "email",
        ).map((category) => (
          <Row
            key={category}
            icon={Folder}
            label={CATEGORY_LABELS[category]}
            count={counts.byCategory[category]}
            active={selection.category === category}
            collapsed={collapsed}
            onClick={() => onSelect({ category })}
          />
        ))}
      </Section>

      <Section title="Priority" collapsed={collapsed}>
        {PRIORITY_META.map(({ value, icon, iconClassName }) => (
          <Row
            key={value}
            icon={icon}
            label={value === "urgent" ? "Urgent" : value === "high" ? "High" : value === "medium" ? "Medium" : "Low"}
            count={counts.byPriority[value]}
            active={selection.priority === value}
            collapsed={collapsed}
            onClick={() => onSelect({ priority: value })}
            iconClassName={iconClassName}
          />
        ))}
      </Section>

      {!collapsed && (
        <Section title="Legend">
          <div className="flex flex-col gap-2 px-3 text-xs leading-relaxed text-fog">
            <p className="flex items-center gap-2">
              <Clock className="size-3 shrink-0" aria-hidden /> Past due: urgent over 24h, others over 3 days.
            </p>
            <p className="flex items-center gap-2">
              <Inbox className="size-3 shrink-0" aria-hidden /> Counts update with every new ticket.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
