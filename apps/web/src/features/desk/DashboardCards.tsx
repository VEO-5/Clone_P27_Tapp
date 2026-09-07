"use client";

import Link from "next/link";
import type { DeskDashboardCards } from "@pearl27/contracts";

const CARDS: {
  key: keyof DeskDashboardCards;
  label: string;
  href: string;
  hint: string;
}[] = [
  { key: "unassigned", label: "Unassigned", href: "/desk/queue?tab=unassigned", hint: "Needs an owner" },
  { key: "pending", label: "Pending", href: "/desk/queue?tab=all&status=pending", hint: "Assigned, not opened" },
  { key: "mine", label: "Mine", href: "/desk/queue?tab=mine", hint: "Your open tickets" },
  { key: "breachingSoon", label: "Breaching soon", href: "/desk/queue?tab=all&sort=due", hint: "SLA pressure" },
  { key: "receivedToday", label: "Received today", href: "/desk/queue?tab=all&sort=newest", hint: "Fresh intake" },
  { key: "resolvedByMeToday", label: "Resolved by me today", href: "/desk/queue?tab=mine", hint: "Your wins" },
];

/** Stat cards that deep-link into the matching queue filter (FE-3.2). */
export function DashboardCards({ cards }: { cards: DeskDashboardCards }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {CARDS.map(({ key, label, href, hint }) => (
        <Link
          key={key}
          href={href}
          aria-label={`${label}: ${cards[key] ?? 0}. ${hint}. Open in queue.`}
          className="rounded-[4px] border border-cream/10 bg-night px-4 py-3.5 text-left shadow-[0_12px_32px_-18px_rgba(16,24,40,0.55)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-iris-400"
        >
          <span className="eyebrow">{label}</span>
          <span className="mt-2 block font-display text-2xl text-cream sm:text-3xl">
            {Number(cards[key] ?? 0)}
          </span>
          <span className="mt-1 block text-[12px] text-haze">{cards.trends?.[key] ?? hint}</span>
        </Link>
      ))}
    </div>
  );
}
