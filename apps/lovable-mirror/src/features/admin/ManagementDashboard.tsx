// @ts-nocheck
"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminDashboardResponse } from "@pearl27/contracts";
import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/shadcn/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { apiFetch } from "@/lib/api";
import { config } from "@/lib/config";

type Range = "7" | "30" | "90";

function Sparkline({ values, good }: { values: number[]; good: boolean }) {
  if (values.length === 0) return <span className="h-8 w-24" aria-hidden="true" />;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const points = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24" aria-hidden="true">
      <polyline points={points} fill="none" stroke={good ? "#2f7a4f" : "#c23b3b"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function KpiCards({ kpis }: { kpis: AdminDashboardResponse["kpis"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {kpis.map((kpi) => {
        const up = kpi.deltaPct >= 0;
        const good = kpi.upGood ?? true;
        const tone = (up && good) || (!up && !good) ? "text-jade-400" : "text-rose-400";
        return (
          <Panel key={kpi.key} className="p-5">
            <p className="eyebrow">{kpi.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="font-display text-3xl text-pearl">{kpi.value}</p>
              <Sparkline values={kpi.spark} good={tone === "text-jade-400"} />
            </div>
            <p className={`mt-2 flex items-center gap-1 text-[12.5px] font-medium ${tone}`}>
              {up ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
              {up ? "+" : ""}{kpi.deltaPct}% <span className="font-normal text-fog">{kpi.deltaLabel}</span>
            </p>
          </Panel>
        );
      })}
    </div>
  );
}

const volumeChartConfig = {
  received: {
    label: "Received",
    color: "var(--chart-2)",
  },
  resolved: {
    label: "Resolved",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "90", label: "Last 3 months" },
  { value: "30", label: "Last 30 days" },
  { value: "7", label: "Last 7 days" },
];

function VolumeChart({
  data,
  range,
  onRangeChange,
}: {
  data: AdminDashboardResponse["volume"];
  range: Range;
  onRangeChange: (range: Range) => void;
}) {
  const totalReceived = data.reduce((s, d) => s + d.received, 0);
  const totalResolved = data.reduce((s, d) => s + d.resolved, 0);
  return (
    <Panel>
      <PanelHeader
        eyebrow="Trends"
        title="Ticket Volume Trend"
        action={
          <Select
            value={range}
            onValueChange={(value) => onRangeChange(value as Range)}
          >
            <SelectTrigger
              className="w-[160px] rounded-lg"
              aria-label="Select date range"
            >
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {RANGE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="p-6">
        <p className="font-display text-3xl text-pearl">
          {totalReceived.toLocaleString()}{" "}
          <span className="text-sm font-normal text-fog">
            received · {totalResolved.toLocaleString()} resolved
          </span>
        </p>
        {data.length === 0 ? (
          <p className="mt-4 text-sm text-fog">No ticket volume in this period.</p>
        ) : (
          <ChartContainer
            config={volumeChartConfig}
            className="mt-4 aspect-auto h-[250px] w-full"
          >
            <AreaChart data={data} accessibilityLayer>
              <defs>
                <linearGradient id="fillReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-received)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-received)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-resolved)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-resolved)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(String(value)).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="resolved"
                type="natural"
                fill="url(#fillResolved)"
                stroke="var(--color-resolved)"
                stackId="a"
              />
              <Area
                dataKey="received"
                type="natural"
                fill="url(#fillReceived)"
                stroke="var(--color-received)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
        <table className="sr-only">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Received</th>
              <th scope="col">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{d.received}</td>
                <td>{d.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

type AgentSort = "name" | "open" | "resolved";

function AgentTable({ rows }: { rows: AdminDashboardResponse["byAgent"] }) {
  const [sort, setSort] = useState<AgentSort>("open");
  const [dir, setDir] = useState<1 | -1>(-1);
  function toggle(key: AgentSort) {
    if (sort === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSort(key);
      setDir(-1);
    }
  }
  const sorted = [...rows].sort((a, b) => {
    const av = sort === "name" ? a.name : sort === "open" ? a.open : a.resolved;
    const bv = sort === "name" ? b.name : sort === "open" ? b.open : b.resolved;
    if (typeof av === "string") return dir * av.localeCompare(bv as string);
    return dir * ((av as number) - (bv as number));
  });
  const header = (key: AgentSort, label: string) => (
    <TableHead aria-sort={sort === key ? (dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => toggle(key)} className="inline-flex min-h-11 items-center gap-1 font-semibold">
        {label} <span aria-hidden>{sort === key ? (dir === 1 ? "▲" : "▼") : ""}</span>
      </button>
    </TableHead>
  );
  return (
    <Panel>
      <PanelHeader eyebrow="Team" title="Volume by agent" />
      <div className="p-6">
        {sorted.length === 0 ? (
          <p className="text-sm text-fog">No agent activity in this period.</p>
        ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              {header("name", "Agent")}
              <TableHead>Received</TableHead>
              <TableHead>Resolved</TableHead>
              {header("open", "Open")}
              <TableHead>Avg resolution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.agentId}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.received}</TableCell>
                <TableCell>{row.resolved}</TableCell>
                <TableCell>{row.open}</TableCell>
                <TableCell>{row.avgResolutionHours}h</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        )}
      </div>
    </Panel>
  );
}

function SlaTable({ rows }: { rows: AdminDashboardResponse["slaTable"] }) {
  return (
    <Panel>
      <PanelHeader eyebrow="Watchlist" title="SLA Monitoring" />
      <div className="p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-fog">No tickets breaching SLA right now.</p>
        ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ticketId}>
                <TableCell>
                  <span className="mono-ref">{row.reference}</span>
                </TableCell>
                <TableCell>{row.subject}</TableCell>
                <TableCell>
                  <PriorityBadge priority={row.priority} size="sm" />
                </TableCell>
                <TableCell>{row.assigneeName}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} size="sm" />
                </TableCell>
                <TableCell>
                  <span className={row.breached ? "font-medium text-destructive" : undefined}>{row.dueLabel}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        )}
      </div>
    </Panel>
  );
}

/** Management analytics: KPIs, volume, agents, SLA, export. */
export function ManagementDashboard() {
  const [range, setRange] = useState<Range>("30");
  const dashboard = useQuery({
    queryKey: ["admin", "dashboard", range],
    queryFn: () => apiFetch<AdminDashboardResponse>(`/admin/dashboard?range=${range}`),
  });
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    const toastId = toast.loading("Preparing CSV export…");
    try {
      const res = await fetch(`${config.apiUrl}/admin/export?format=csv&range=${range}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed. Try again.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tickets-${range}d.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.", { id: toastId });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Admin · Overview</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">Dashboard</h1>
          <p className="mt-1 text-[13px] text-fog">Team performance — last 7 / 30 / 90 days</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting}>
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>

      {dashboard.isPending && (
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      )}
      {dashboard.isError && (
        <Panel className="p-6">
          <p role="alert" className="text-sm text-rose-400">
            Couldn&apos;t load analytics.{" "}
            <button type="button" onClick={() => dashboard.refetch()} className="font-medium underline underline-offset-4">
              Retry
            </button>
          </p>
        </Panel>
      )}
      {dashboard.data && (
        <div className="flex flex-col gap-6">
          <KpiCards kpis={dashboard.data.kpis} />
          <VolumeChart data={dashboard.data.volume} range={range} onRangeChange={setRange} />
          <AgentTable rows={dashboard.data.byAgent} />
          <SlaTable rows={dashboard.data.slaTable} />
        </div>
      )}
    </div>
  );
}
