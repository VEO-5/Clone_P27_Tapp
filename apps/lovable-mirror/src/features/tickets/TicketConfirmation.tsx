// @ts-nocheck
"use client";

import type { Ticket } from "@pearl27/contracts";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/shadcn/button";
import { StatusBadge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

import { UploadStatusList, type UploadState } from "./UploadStatusList";

export type { UploadState };

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

        <UploadStatusList uploads={uploads} submittedAt={ticket.createdAt} onRetry={onRetry} />

        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild>
            <Link to={`/tickets/${ticket.reference}`}>
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
