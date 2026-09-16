"use client";

import { useState } from "react";
import type { DashboardSeries } from "@pearl27/contracts";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bars({ values, labels, colorClass }: { values: number[]; labels: string[]; colorClass: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1.5" aria-hidden="true">
      {values.map((value, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${labels[i]}: ${value}`}>
          <div className="flex h-24 w-full items-end rounded-[2px] bg-ink-900">
            <div className={`w-full rounded-[2px] ${colorClass}`} style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
          </div>
          <span className="truncate text-[10px] text-fog">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function HBars({ entries }: { entries: { label: string; value: number }[] }) {
  const max = Math.max(1, ...entries.map((e) => e.value));
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {entries.map((entry) => (
        <div key={entry.label} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-[12px] text-mist">{entry.label}</span>
          <div className="h-3 flex-1 rounded-[2px] bg-ink-900">
            <div className="h-full rounded-[2px] bg-iris-500" style={{ width: `${(entry.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right text-[12px] font-medium text-pearl">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Lightweight SVG-free charts: visual bars + hidden data table + text summary each. */
export function DashboardCharts({ series }: { series: DashboardSeries }) {
  const [range, setRange] = useState<7 | 30>(7);
  const sliced = series.receivedVsResolved.slice(-range);
  const totalReceived = sliced.reduce((sum, d) => sum + d.received, 0);
  const totalResolved = sliced.reduce((sum, d) => sum + d.resolved, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <PanelHeader
          eyebrow="Trends"
          title="Received vs resolved"
          action={
            <div className="flex gap-1" role="group" aria-label="Date range">
              {([7, 30] as const).map((days) => (
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
          }
        />
        <div className="p-6">
          <Bars
            values={sliced.map((d) => d.received)}
            labels={sliced.map((d) => d.date.slice(5))}
            colorClass="bg-iris-500"
          />
          <p className="mt-3 text-[13px] text-mist">
            {totalReceived} received, {totalResolved} resolved in the last {range} days.
          </p>
          <DataTable
            headers={["Date", "Received", "Resolved"]}
            rows={sliced.map((d) => [d.date, d.received, d.resolved])}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Queue now" title="My open tickets by status" />
        <div className="p-6">
          <HBars entries={series.byStatus.map((s) => ({ label: s.status.replace("_", " "), value: s.count }))} />
          <p className="mt-3 text-[13px] text-mist">
            {series.byStatus.reduce((sum, s) => sum + s.count, 0)} open tickets across the queue.
          </p>
          <DataTable headers={["Status", "Count"]} rows={series.byStatus.map((s) => [s.status, s.count])} />
        </div>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Queue now" title="Category breakdown" />
        <div className="p-6">
          <HBars entries={series.byCategory.map((c) => ({ label: c.categoryName, value: c.count }))} />
          <p className="mt-3 text-[13px] text-mist">Where the current queue sits by category.</p>
          <DataTable
            headers={["Category", "Count"]}
            rows={series.byCategory.map((c) => [c.categoryName, c.count])}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Queue now" title="Ticket age" />
        <div className="p-6">
          <HBars entries={series.ageBuckets.map((b) => ({ label: b.bucket, value: b.count }))} />
          <p className="mt-3 text-[13px] text-mist">How long open tickets have been waiting.</p>
          <DataTable headers={["Age", "Count"]} rows={series.ageBuckets.map((b) => [b.bucket, b.count])} />
        </div>
      </Panel>
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Loading charts">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-56" />
      ))}
    </div>
  );
}
