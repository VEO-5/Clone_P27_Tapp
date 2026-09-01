"use client";

import { ArrowRight, CheckCircle2, MailCheck, MailWarning, Paperclip, Plus } from "lucide-react";

import { CopyButton } from "@/components/CopyButton";
import { Button, LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { CATEGORY_LABELS, type TicketDetail } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

/**
 * The confirmation state required by the brief — a clear success screen with a
 * reference the employee can quote, plus a direct route into tracking.
 */
export function TicketConfirmation({
  ticket,
  emailSent,
  onReset,
}: {
  ticket: TicketDetail;
  emailSent: boolean;
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
            Keep the reference below. You&apos;re signed into My tickets on this device — come back
            any time with the same work email.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-ink-600 bg-ink-900/70 px-6 py-5">
          <p className="eyebrow">Ticket reference</p>
          <p className="mono-ref text-3xl font-medium text-pearl sm:text-4xl">
            {ticket.reference}
          </p>
          <CopyButton value={ticket.reference} label="Copy reference" />
        </div>

        <dl className="grid w-full gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700 sm:grid-cols-3">
          {[
            { label: "Status", value: <StatusBadge status={ticket.status} size="sm" /> },
            { label: "Category", value: CATEGORY_LABELS[ticket.category] },
            { label: "Submitted", value: formatDateTime(ticket.createdAt) },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-1.5 bg-ink-850 px-4 py-3 text-left">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-fog">{row.label}</dt>
              <dd className="text-[13px] font-medium text-pearl-dim">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col items-center gap-2 text-[12.5px] text-fog">
          <p className="flex items-center gap-2">
            {emailSent ? (
              <>
                <MailCheck className="size-3.5 text-jade-400" aria-hidden />
                Confirmation emailed to {ticket.employeeEmail}
              </>
            ) : (
              <>
                <MailWarning className="size-3.5 text-gold-400" aria-hidden />
                Email is in log-only mode — your ticket is saved and tracked
              </>
            )}
          </p>
          {ticket.attachments.length > 0 && (
            <p className="flex items-center gap-2">
              <Paperclip className="size-3.5" aria-hidden />
              {ticket.attachments.length} file
              {ticket.attachments.length === 1 ? "" : "s"} attached
            </p>
          )}
        </div>

        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <LinkButton
            href="/my-tickets"
            trailingIcon={<ArrowRight className="size-4" aria-hidden />}
          >
            Open my tickets
          </LinkButton>
          <LinkButton href={`/track/${ticket.reference}`} variant="secondary">
            Just this ticket
          </LinkButton>
          <Button variant="ghost" onClick={onReset} icon={<Plus className="size-4" />}>
            Submit another
          </Button>
        </div>
      </div>
    </Panel>
  );
}
