"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminDashboardResponse } from "@pearl27/contracts";
import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
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
import { formatRelative } from "@/lib/utils";

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

function VolumeChart({ data }: { data: AdminDashboardResponse["volume"] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.received, d.resolved)));
  const totalReceived = data.reduce((s, d) => s + d.received, 0);
  const totalResolved = data.reduce((s, d) => s + d.resolved, 0);
  const day = data.find((d) => d.date === selected);
  return (
    <Panel>
      <PanelHeader eyebrow="Trends" title="Ticket Volume Trend" />
      <div className="p-6">
        <p className="font-display text-3xl text-pearl">
          {totalReceived.toLocaleString()}{" "}
          <span className="text-sm font-normal text-fog">
            received · {totalResolved.toLocaleString()} resolved
          </span>
        </p>
        {day && (
          <p className="mt-1 text-[13px] text-mist" aria-live="polite">
            {day.date}: {day.received} received, {day.resolved} resolved.
          </p>
        )}
        <div className="mt-4 flex h-44 items-end gap-1" role="group" aria-label={`Ticket volume, ${totalReceived} received total`}>
          {data.length === 0 && (
            <p className="text-sm text-fog">No ticket volume in this period.</p>
          )}
          {data.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelected(d.date === selected ? null : d.date)}
              aria-pressed={d.date === selected}
              aria-label={`${d.date}: ${d.received} received, ${d.resolved} resolved`}
              title={`${d.date}: ${d.received} received`}
              className={`flex min-w-0 flex-1 flex-col justify-end gap-0.5 rounded-[2px] p-0.5 ${d.date === selected ? "bg-ink-900" : ""}`}
            >
              <span className="w-full rounded-[2px] bg-ink-600" style={{ height: `${Math.max(3, (d.received / max) * 110)}px` }} aria-hidden />
              <span className="w-full rounded-[2px] bg-pearl" style={{ height: `${Math.max(3, (d.resolved / max) * 110)}px` }} aria-hidden />
            </button>
          ))}
        </div>
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

const UPDATE_KIND_META: Record<
  AdminDashboardResponse["updates"][number]["kind"],
  { label: string; className: string }
> = {
  assigned: { label: "Assigned", className: "border-iris-400/40 bg-iris-400/10 text-iris-700" },
  released: { label: "Released", className: "border-amber-200 bg-amber-50 text-amber-700" },
  message: { label: "Reply", className: "border-jade-400/40 bg-jade-400/10 text-jade-400" },
  status_changed: { label: "Status", className: "border-sky-200 bg-sky-50 text-sky-700" },
};

function LatestUpdates({ items }: { items: AdminDashboardResponse["updates"] }) {
  return (
    <Panel>
      <PanelHeader eyebrow="Activity" title="Latest Updates" />
      {items.length === 0 ? (
        <p className="p-6 text-sm text-fog">No updates in this period.</p>
      ) : (
        <ul className="flex flex-col gap-1 p-3">
          {items.map((item) => {
            const meta = UPDATE_KIND_META[item.kind];
            return (
              <li key={item.id} className="border-l-2 border-iris-400/60 pl-3">
                <Link
                  href={`/desk/tickets/${item.ticketId}`}
                  aria-label={`${item.text} — ${item.ticketReference}`}
                  title={`${item.ticketReference}: ${item.text}`}
                  className="block rounded-[2px] px-1 py-1.5 outline-none transition-colors hover:bg-ink-900/60 focus-visible:ring-2 focus-visible:ring-iris-400"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    <span className="mono-ref text-[12px]">{item.ticketReference}</span>
                  </span>
                  <p className="mt-1 text-[13.5px] font-medium text-pearl">{item.text}</p>
                  <p className="mt-0.5 text-[12.5px] text-fog">
                    {item.actorName} · {formatRelative(item.createdAt)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** Management analytics: KPIs, volume, agents, SLA, updates, export. */
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
          <div className="flex gap-1" role="group" aria-label="Date range">
            {(["7", "30", "90"] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRange(days)}
                aria-pressed={range === days}
                className={`min-h-11 rounded-[2px] px-3 text-[13px] font-medium ${range === days ? "bg-pearl text-cream" : "text-mist hover:text-pearl"}`}
              >
                {days}d
              </button>
            ))}
          </div>
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
          <VolumeChart data={dashboard.data.volume} />
          <AgentTable rows={dashboard.data.byAgent} />
          <SlaTable rows={dashboard.data.slaTable} />
          <LatestUpdates items={dashboard.data.updates} />
        </div>
      )}
    </div>
  );
}
