"use client";

import type { DashboardSeries, DeskDashboardCards } from "@pearl27/contracts";
import { Check, CircleDot, Clock, Ticket as TicketIcon, TrendingDown, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";

import { Card, CardContent } from "@/components/shadcn/card";

const STATS: {
  key: string;
  label: string;
  eyebrow: string;
  icon: ComponentType<{ className?: string }>;
  trendKey?: string;
}[] = [
  { key: "__total", label: "Total Tickets", eyebrow: "TOTAL TICKETS", icon: TicketIcon, trendKey: "receivedToday" },
  { key: "open", label: "Open", eyebrow: "OPEN", icon: CircleDot, trendKey: "mine" },
  { key: "pending", label: "Pending", eyebrow: "PENDING", icon: Clock, trendKey: "pending" },
  { key: "resolved", label: "Resolved", eyebrow: "RESOLVED", icon: Check, trendKey: "resolvedByMeToday" },
];

/** Reference-style stat cards: outer card, eyebrow row, nested inner panel with count + trend. Display only. */
export function DeskStatCards({
  cards,
  series,
}: {
  cards: DeskDashboardCards;
  series: DashboardSeries;
}) {
  const byStatus = new Map(series.byStatus.map((s) => [s.status, s.count]));
  const total = series.byStatus.reduce((sum, s) => sum + s.count, 0);
  const countFor = (key: string) =>
    key === "__total" ? total : (byStatus.get(key as "open") ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="list" aria-label="Ticket stats">
      {STATS.map(({ key, label, eyebrow, icon: Icon, trendKey }) => {
        const trend = (trendKey && cards.trends?.[trendKey]) || null;
        const down = trend?.trim().startsWith("-") ?? false;
        const TrendIcon = down ? TrendingDown : TrendingUp;
        return (
          <div key={key} role="listitem" aria-label={`${label}: ${countFor(key)}${trend ? `. ${trend}` : ""}`} className="rounded-2xl">
            <Card className="gap-0 rounded-2xl border-ink-700 bg-white px-3.5 pb-3.5 pt-3 shadow-[0_1px_2px_rgba(27,42,74,0.06)]">
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-fog">
                <Icon className="size-3.5" aria-hidden />
                {eyebrow}
              </p>
              <CardContent className="mt-2 rounded-xl border border-ink-700/60 bg-ink-950 px-4 py-3">
                <p className="font-sans text-[28px] font-semibold leading-none tracking-tight text-pearl tabular-nums">
                  {countFor(key)}
                </p>
                {trend && (
                  <p className="mt-1.5 flex items-center gap-1 text-[12px]">
                    <TrendIcon className="size-3.5 text-rose-400" aria-hidden />
                    <span className="font-medium text-rose-400">{trend.split(" vs ")[0]}</span>
                    <span className="truncate text-fog">vs {trend.split(" vs ")[1] ?? "last week"}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
