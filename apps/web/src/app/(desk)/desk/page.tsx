"use client";

import Link from "next/link";

import { Panel, PanelHeader } from "@/components/ui/Panel";
import { useSession } from "@/features/auth/useSession";

/** Agent dashboard — full cards + charts land in Phase 3. */
export default function DeskPage() {
  const session = useSession();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <p className="eyebrow">Support desk</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">
        {session.data ? `Welcome, ${session.data.name}` : "Dashboard"}
      </h1>
      <Panel lit className="mt-8">
        <PanelHeader
          eyebrow="Phase 3"
          title="Agent overview wires up next"
          description="Unassigned / Pending / Mine / Breaching cards, received-vs-resolved charts, my list, and the live activity feed."
        />
        <div className="p-6">
          <Link href="/desk/queue" className="text-sm font-medium text-iris-600 underline-offset-4 hover:underline">
            Open the queue →
          </Link>
        </div>
      </Panel>
    </div>
  );
}
