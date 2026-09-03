import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, KeyRound, MessageSquare } from "lucide-react";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { LinkButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { isAuthenticated } from "@/lib/adminAuth";

export const metadata = {
  title: "Support sign in",
};

export default async function AdminLoginPage() {
  if (await isAuthenticated()) redirect("/admin");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
      <LinkButton href="/" variant="ghost" size="sm" icon={<ArrowLeft className="size-3.5" aria-hidden />} className="mb-6 -ml-3">
        Back to home
      </LinkButton>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
        <AdminLoginForm />
        <Panel tone="night" lit className="p-6">
          <p className="eyebrow mb-4">On the desk</p>
          <ul className="flex flex-col gap-4">
            <li className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-cream/10 bg-night-deep text-iris-400">
                <ArrowRightLeft className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-cream">Change status</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-haze">
                  Open → In progress → Resolved → Closed. Employees see it immediately.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-cream/10 bg-night-deep text-iris-400">
                <MessageSquare className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-cream">Reply on the timeline</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-haze">
                  Notes land on the employee ticket, not in a private thread.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-cream/10 bg-night-deep text-iris-400">
                <KeyRound className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-cream">Access-code session</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-haze">
                  HttpOnly cookie, eight hours. No password account for this assessment.
                </span>
              </span>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
