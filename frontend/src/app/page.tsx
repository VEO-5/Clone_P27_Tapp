import { ArrowRight, Clock3, MailCheck, Search, ShieldCheck, Sparkles } from "lucide-react";

import { TicketForm } from "@/components/TicketForm";
import { LinkButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const STEPS = [
  {
    icon: Sparkles,
    title: "Submit in under a minute",
    body: "Describe the issue and attach a screenshot. No account, no forms to chase.",
  },
  {
    icon: MailCheck,
    title: "Get a reference instantly",
    body: "You receive a code like PRL-7K4M2X and a confirmation email straight away.",
  },
  {
    icon: Clock3,
    title: "Watch it move",
    body: "Open → In progress → Resolved, with every support reply on your timeline.",
  },
];

export default function SubmitTicketPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="eyebrow animate-rise">Pearl 27 · System Support</p>
        <h1
          className="animate-rise mt-5 font-display text-[2.8rem] leading-[1.08] tracking-tight sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          <span className="italic">Sphere support</span>
          <br />
          <span className="text-pearl">without the chase.</span>
        </h1>
        <p
          className="animate-rise mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-mist sm:text-base"
          style={{ animationDelay: "120ms" }}
        >
          Report a problem with your Sphere account, attach a screenshot, and follow it all the way
          to resolved. The System Support team sees it the moment you hit submit.
        </p>

        <div
          className="animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "180ms" }}
        >
          <LinkButton
            href="#new-ticket"
            trailingIcon={<ArrowRight className="size-4" aria-hidden />}
          >
            Report an issue
          </LinkButton>
          <LinkButton
            href="/my-tickets"
            variant="secondary"
            icon={<Search className="size-4" aria-hidden />}
          >
            Open my tickets
          </LinkButton>
        </div>
      </section>

      {/* Form + aside */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
        <TicketForm />

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Panel className="p-6">
            <p className="eyebrow mb-5">What happens next</p>
            <ol className="flex flex-col gap-5">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="relative flex flex-col items-center">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-ink-700 bg-white text-iris-500">
                      <step.icon className="size-4" aria-hidden />
                    </span>
                    {index < STEPS.length - 1 && (
                      <span className="mt-2 w-px flex-1 bg-gradient-to-b from-ink-600 to-transparent" />
                    )}
                  </span>
                  <span className="pb-1">
                    <span className="block text-[13.5px] font-semibold text-pearl">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-fog">
                      {step.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-jade-400/25 bg-jade-400/10 text-jade-400">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-pearl">Your details stay internal</p>
                <p className="mt-1 text-[13px] leading-relaxed text-fog">
                  Tickets and screenshots are stored in Pearl 27&apos;s private Supabase project.
                  Attachments are never public — they&apos;re served through short-lived signed
                  links.
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <p className="text-[13.5px] font-semibold text-pearl">Already submitted something?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fog">
              Sign in with your work email to see every ticket and its live status.
            </p>
            <LinkButton
              href="/my-tickets"
              variant="secondary"
              size="sm"
              className="mt-4"
              trailingIcon={<ArrowRight className="size-3.5" aria-hidden />}
            >
              Open my tickets
            </LinkButton>
          </Panel>
        </aside>
      </section>
    </div>
  );
}
