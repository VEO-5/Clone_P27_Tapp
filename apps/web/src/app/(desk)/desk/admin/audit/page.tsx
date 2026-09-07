"use client";

import { useQuery } from "@tanstack/react-query";
import type { AuditItem } from "@pearl27/contracts";
import { Fragment, useState } from "react";

import { Button } from "@/components/shadcn/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

/** Audit log: paginated, expandable JSON diffs. */
export default function AuditPage() {
  const [pages, setPages] = useState<AuditItem[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const audit = useQuery({
    queryKey: ["admin", "audit", cursor ?? "first"],
    queryFn: async () => {
      const page = await apiFetch<{ items: AuditItem[]; nextCursor: string | null }>(
        `/admin/audit?limit=15${cursor ? `&cursor=${cursor}` : ""}`,
      );
      setPages((prev) => [...prev, page.items]);
      return page;
    },
  });

  const seen = new Set<string>();
  const rows = pages.flat().filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));

  return (
    <Panel lit>
      <PanelHeader eyebrow="Admin · Audit" title="Audit log" description="Who did what, with before → after." />
        <div className="p-6 sm:p-8">
          {audit.isPending && <Skeleton className="h-48" />}
          {audit.isError && (
            <p role="alert" className="text-sm text-rose-400">
              Couldn&apos;t load the audit log.{" "}
              <button type="button" onClick={() => audit.refetch()} className="font-medium underline underline-offset-4">
                Retry
              </button>
            </p>
          )}
          {rows.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>
                    <span className="sr-only">Details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {rows.map((item) => (
                <Fragment key={item.id}>
                  <TableRow>
                    <TableCell>{item.actor}</TableCell>
                    <TableCell>
                      <span className="mono-ref">{item.action}</span>
                    </TableCell>
                    <TableCell>{item.entity}</TableCell>
                    <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setExpanded(expanded === item.id ? null : item.id)} aria-expanded={expanded === item.id}>
                        {expanded === item.id ? "Hide" : "Diff"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded === item.id && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <pre className="overflow-x-auto rounded-md bg-night-deep p-3 font-mono text-[12px] text-cream">
                          {JSON.stringify(item.diff ?? { summary: item.summary }, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              </TableBody>
            </Table>
            </div>
          )}
          {audit.data?.nextCursor && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setCursor(audit.data!.nextCursor)} disabled={audit.isFetching}>
                {audit.isFetching ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </Panel>
  );
}
