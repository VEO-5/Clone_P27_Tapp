import { Suspense } from "react";

import { TicketLookupForm } from "@/components/TicketLookupForm";
import { Panel } from "@/components/ui/Panel";

export const metadata = {
  title: "Track a ticket",
};

/**
 * Phase 0 placeholder: per-user /tickets/mine lands in Phase 2.
 * Lookup by reference/email is removed (tickets are per signed-in user).
 */
export default function TrackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      <section className="text-center">
        <p className="eyebrow animate-rise">Status lookup</p>
        <h1 className="animate-rise mt-5 font-display text-[2.4rem] leading-[1.1] tracking-tight sm:text-5xl">
          <span className="italic">Find your ticket.</span>
        </h1>
        <p className="animate-rise mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-mist">
          Phase 2 replaces this with <span className="mono-ref">/tickets</span> for the signed-in
          employee.
        </p>
      </section>

      <Panel lit className="animate-rise mt-10 p-5 sm:p-7">
        <Suspense fallback={null}>
          <TicketLookupForm />
        </Suspense>
      </Panel>
    </div>
  );
}
