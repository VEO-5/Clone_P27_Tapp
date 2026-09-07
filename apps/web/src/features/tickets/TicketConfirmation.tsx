"use client";

import type { Ticket } from "@pearl27/contracts";
import { ArrowRight, CheckCircle2, Paperclip, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/shadcn/button";
import { StatusBadge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { formatDateTime } from "@/lib/utils";

export interface UploadState {
  fileName: string;
  status: "uploading" | "done" | "error";
  progress: number;
}

/**
 * Confirmation after POST /tickets: reference, Pending chip, Chat handoff,
 * per-file upload states with retry. Failures never lose the ticket (FE-2.7).
 */
export function TicketConfirmation({
  ticket,
  uploads,
  onRetry,
  onReset,
}: {
  ticket: Ticket;
  uploads: UploadState[];
  onRetry: (index: number) => void;
  onReset: () => void;
}) {
  const done = uploads.filter((u) => u.status === "done").length;
  const failed = uploads.filter((u) => u.status === "error");
  const scanning = uploads.filter((u) => u.status !== "error").length - done;

  return (
    <Panel lit className="animate-rise overflow-hidden">
      <div className="flex flex-col items-center gap-5 px-6 pb-8 pt-10 text-center sm:px-10">
        <span className="animate-pulse-ring grid size-16 place-items-center rounded-full border border-jade-400/30 bg-jade-400/10">
          <CheckCircle2 className="size-8 text-jade-400" strokeWidth={2} aria-hidden />
        </span>

        <div>
          <p className="eyebrow mb-2">Submission received</p>
          <h2 className="font-display text-3xl leading-tight text-pearl sm:text-4xl">
            Your ticket is with System Support
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist">
            Our support team will reach out to you shortly so you can explain the issue in detail.
          </p>
        </div>

        <div className="glass-night flex w-full flex-col items-center gap-3 rounded-[4px] px-6 py-6">
          <p className="eyebrow">Ticket reference</p>
          <p className="mono-ref text-3xl font-medium text-cream sm:text-4xl">{ticket.reference}</p>
          <CopyButton
            value={ticket.reference}
            label="Copy reference"
            className="border-cream/20 bg-transparent text-cream hover:border-iris-400/50 hover:bg-white/8 hover:text-cream"
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatusBadge status={ticket.status} size="sm" />
          </div>
        </div>

        {uploads.length > 0 && (
          <div className="w-full rounded-[4px] border border-ink-700 p-4 text-left" aria-live="polite">
            <p className="flex items-center gap-2 text-[13px] font-medium text-pearl-dim">
              <Paperclip className="size-3.5" aria-hidden />
              {failed.length === 0
                ? `${done} of ${uploads.length} files attached${scanning > 0 ? " · scanning" : ""}`
                : `${done} of ${uploads.length} files attached · ${failed.length} failed`}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {uploads.map((upload, index) => (
                <li key={`${upload.fileName}-${index}`} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-pearl-dim">{upload.fileName}</span>
                    {upload.status === "uploading" && (
                      <span
                        className="mt-1 block h-1 overflow-hidden rounded-full bg-ink-700"
                        role="progressbar"
                        aria-valuenow={upload.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${upload.fileName} upload progress`}
                      >
                        <span className="block h-full bg-iris-500 transition-all" style={{ width: `${upload.progress}%` }} />
                      </span>
                    )}
                    {upload.status === "error" && (
                      <span className="mt-0.5 block text-[12.5px] text-rose-400">
                        Upload failed — your ticket is saved.
                      </span>
                    )}
                  </span>
                  {upload.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-jade-400" aria-label="Uploaded" />}
                  {upload.status === "error" && (
                    <button
                      type="button"
                      onClick={() => onRetry(index)}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[2px] border border-ink-600 px-3 text-[13px] font-medium text-pearl hover:border-iris-400"
                    >
                      <RotateCcw className="size-3.5" aria-hidden />
                      Retry
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-fog">Submitted {formatDateTime(ticket.createdAt)}</p>
          </div>
        )}

        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild>
            <Link href={`/tickets/${ticket.reference}`}>
              View ticket
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button variant="ghost" onClick={onReset}>
            <Plus className="size-4" aria-hidden />
            Submit another
          </Button>
        </div>
      </div>
    </Panel>
  );
}
