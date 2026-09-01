import { Inbox, SearchX } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { TicketCard } from "@/components/TicketCard";
import { TicketLookupForm } from "@/components/TicketLookupForm";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { isValidReference, normaliseReference } from "@/lib/reference";
import { getRepository } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track a ticket",
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const ref = params.ref?.trim();
  const email = params.email?.trim();

  if (ref && isValidReference(ref)) {
    redirect(`/track/${normaliseReference(ref)}`);
  }

  const tickets = email ? await getRepository().listTicketsByEmail(email) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      <section className="text-center">
        <p className="eyebrow animate-rise">Status lookup</p>
        <h1
          className="animate-rise mt-5 font-display text-[2.4rem] leading-[1.1] tracking-tight sm:text-5xl"
          style={{ animationDelay: "60ms" }}
        >
          <span className="italic">Find your ticket.</span>
        </h1>
        <p
          className="animate-rise mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-mist"
          style={{ animationDelay: "120ms" }}
        >
          Enter the reference from your confirmation, or the work email you used when you submitted.
        </p>
      </section>

      <Panel lit className="animate-rise mt-10 p-5 sm:p-7" style={{ animationDelay: "160ms" }}>
        <Suspense fallback={null}>
          <TicketLookupForm autoFocus={!email} />
        </Suspense>
      </Panel>

      {email && (
        <section className="mt-8" aria-live="polite">
          {tickets && tickets.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-mist">
                {tickets.length} ticket{tickets.length === 1 ? "" : "s"} for{" "}
                <span className="font-medium text-pearl">{email.toLowerCase()}</span>
              </p>
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} href={`/track/${ticket.reference}`} />
              ))}
            </div>
          ) : (
            <Panel>
              <EmptyState
                icon={<Inbox className="size-5" aria-hidden />}
                title="No tickets for that email"
                description="Check the address you used when you submitted, or look the ticket up with its PRL- reference instead."
              />
            </Panel>
          )}
        </section>
      )}

      {ref && !isValidReference(ref) && (
        <Panel className="mt-8">
          <EmptyState
            icon={<SearchX className="size-5" aria-hidden />}
            title="That doesn't look like a reference"
            description="References look like PRL-7K4M2X. You can also search by the email you used."
          />
        </Panel>
      )}
    </div>
  );
}
