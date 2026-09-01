import { ArrowLeft, SearchX } from "lucide-react";
import type { Metadata } from "next";

import { AttachmentList } from "@/components/AttachmentList";
import { Timeline } from "@/components/Timeline";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/Panel";
import { CopyButton } from "@/components/CopyButton";
import { CATEGORY_LABELS } from "@/lib/types";
import { normaliseReference } from "@/lib/reference";
import { getRepository } from "@/lib/repo";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return { title: normaliseReference(reference) };
}

export default async function TrackTicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const ticket = await getRepository().getTicketByReference(normaliseReference(reference));

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <Panel>
          <EmptyState
            icon={<SearchX className="size-5" aria-hidden />}
            title="No ticket found"
            description={`Nothing matches ${normaliseReference(reference)}. Check the code, or look it up by the email you used.`}
            action={
              <LinkButton href="/track" variant="secondary">
                Try another lookup
              </LinkButton>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <LinkButton
        href="/track"
        variant="ghost"
        size="sm"
        icon={<ArrowLeft className="size-3.5" aria-hidden />}
        className="-ml-3 mb-6"
      >
        Back to lookup
      </LinkButton>

      <Panel lit>
        <PanelHeader
          eyebrow="Ticket"
          title={ticket.title}
          description={`${ticket.employeeName} · ${ticket.employeeEmail}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          }
        />

        <div className="grid gap-px border-b border-ink-700/70 bg-ink-700 sm:grid-cols-3">
          {[
            { label: "Reference", value: ticket.reference, mono: true },
            { label: "Category", value: CATEGORY_LABELS[ticket.category] },
            { label: "Submitted", value: formatDateTime(ticket.createdAt) },
          ].map((row) => (
            <div key={row.label} className="bg-ink-850 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-fog">{row.label}</p>
              <p className={`mt-1.5 text-[13.5px] font-medium text-pearl ${row.mono ? "mono-ref" : ""}`}>
                {row.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-8 p-6 sm:p-8">
          <section>
            <p className="eyebrow mb-3">Description</p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-pearl-dim">
              {ticket.description}
            </p>
            <div className="mt-4">
              <CopyButton value={ticket.reference} label="Copy reference" />
            </div>
          </section>

          <section>
            <p className="eyebrow mb-3">Attachments</p>
            <AttachmentList attachments={ticket.attachments} />
          </section>

          <section>
            <p className="eyebrow mb-4">Updates</p>
            <Timeline events={ticket.events} />
          </section>
        </div>
      </Panel>
    </div>
  );
}
