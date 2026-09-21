"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { AuditItem } from "@pearl27/contracts";
import { Fragment, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/shadcn/button";
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
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AuditPage {
  items: AuditItem[];
  nextCursor: string | null;
}

const PAGE_LIMIT = 15;

/** Paginated audit log with expandable diffs. Live ownership entries come first. */
export function AuditTable() {
  const audit = useInfiniteQuery({
    queryKey: ["admin", "audit"],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      apiFetch<AuditPage>(
        `/admin/audit?limit=${PAGE_LIMIT}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (audit.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading audit log" className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (audit.isError) {
    return (
      <p role="alert" className="text-sm text-rose-400">
        Couldn&apos;t load the audit log.{" "}
        <button type="button" onClick={() => audit.refetch()} className="font-medium underline underline-offset-4">
          Retry
        </button>
      </p>
    );
  }

  const rows = audit.data.pages.flatMap((page) => page.items);

  if (rows.length === 0) {
    return <p className="text-[13px] text-fog">No audit entries yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <Table aria-label="Audit log">
          <TableHeader>
            <TableRow>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>When</TableHead>
              <TableHead>
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => {
              const open = expanded.has(item.id);
              return (
                <Fragment key={item.id}>
                  <TableRow>
                    <TableCell className="font-medium">{item.actor}</TableCell>
                    <TableCell>
                      <span className="mono-ref text-[12px]">{item.action}</span>
                      <span className="mt-0.5 block max-w-64 truncate text-xs text-muted-foreground" title={item.summary}>
                        {item.summary}
                      </span>
                    </TableCell>
                    <TableCell className="mono-ref text-[12px]">{item.entity}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground" title={formatDateTime(item.createdAt)}>
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.diff ? (
                        <Button variant="ghost" size="sm" onClick={() => toggle(item.id)} aria-expanded={open}>
                          {open ? "Hide" : "Diff"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {open && item.diff && (
                    <TableRow>
                      <TableCell colSpan={5} className={cn("bg-muted/50")}>
                        <pre className="mono-ref max-h-48 overflow-auto rounded-md border bg-background p-3 text-[11.5px] leading-relaxed">
                          {JSON.stringify(item.diff, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center">
        {audit.hasNextPage ? (
          <Button variant="outline" size="sm" onClick={() => void audit.fetchNextPage()} disabled={audit.isFetchingNextPage}>
            {audit.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden />}
            Load more
          </Button>
        ) : (
          <p className="text-[12.5px] text-fog" role="status">
            Showing all {rows.length} entr{rows.length === 1 ? "y" : "ies"}
          </p>
        )}
      </div>
    </div>
  );
}
