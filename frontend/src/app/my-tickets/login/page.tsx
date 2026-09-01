import { redirect } from "next/navigation";
import { Clock3, Inbox, ShieldCheck } from "lucide-react";

import { EmployeeLoginForm } from "@/components/EmployeeLoginForm";
import { LinkButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { getEmployeeSession } from "@/lib/employeeAuth";

export const metadata = {
  title: "Sign in to your tickets",
};

export default async function EmployeeLoginPage() {
  if (await getEmployeeSession()) redirect("/my-tickets");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
        <EmployeeLoginForm />
        <aside className="flex flex-col gap-4">
          <Panel tone="night" lit className="p-6">
            <p className="eyebrow mb-4">What you get</p>
            <ul className="flex flex-col gap-4">
              <li className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-cream/10 bg-night-deep text-iris-400">
                  <Inbox className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-cream">Every ticket</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-haze">
                    Open, in progress, resolved, and closed — newest first.
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-cream/10 bg-night-deep text-iris-400">
                  <Clock3 className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-cream">Stays signed in</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-haze">
                    This device remembers you for 30 days. No password to keep.
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-cream/10 bg-night-deep text-jade-400">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-cream">Just your email</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-haze">
                    We only show tickets submitted with this work address.
                  </span>
                </span>
              </li>
            </ul>
          </Panel>
          <p className="text-[13px] text-fog">
            Have a reference instead?{" "}
            <LinkButton href="/track" variant="ghost" size="sm" className="inline h-auto px-1 py-0">
              Look up a single ticket
            </LinkButton>
          </p>
        </aside>
      </div>
    </div>
  );
}
