"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "@/lib/query";

import { MOCK_ROLES, landingTarget, mockSignIn } from "./mockSession";
import { EmailSignInForm } from "./EmailSignInForm";

/** Mock-mode only: email sign-in plus one-click role quick-pick. Replaced by the real API when it ships. */
export function MockSignInButtons({ next }: { next?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingRole, setSigningRole] = useState<(typeof MOCK_ROLES)[number]["role"] | null>(null);

  async function signInAs(role: (typeof MOCK_ROLES)[number]["role"]) {
    if (signingRole) return;
    setSigningRole(role);
    try {
      const { landing, profile } = await mockSignIn(role);
      // Bust the Infinity-cached session so gates read the new role, not the
      // profile fetched on the sign-in page load. The auth-route header stays
      // minimal (see SessionHeader), so this early flip never flashes authed
      // chrome over the sign-in card before the push below lands.
      if (profile) queryClient.setQueryData(queryKeys.me, profile);
      else await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.push(landingTarget(next, landing));
    } finally {
      setSigningRole(null);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <EmailSignInForm next={next} />
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-ink-600" />
        <span className="text-[12px] uppercase tracking-[0.12em] text-fog">Quick demo sign-in</span>
        <span className="h-px flex-1 bg-ink-600" />
      </div>
      <div className="flex flex-col gap-3" role="group" aria-label="Mock sign-in roles">
      {MOCK_ROLES.map(({ role, label, description }) => (
        <button
          key={role}
          type="button"
          disabled={signingRole !== null}
          aria-busy={signingRole === role || undefined}
          onClick={() => void signInAs(role)}
          className="flex min-h-11 flex-col items-start justify-center gap-0.5 rounded-lg border border-ink-600 bg-white px-4 py-2.5 text-left transition-colors hover:border-iris-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="text-sm font-medium text-pearl">
            {signingRole === role ? "Signing you in…" : `Continue as ${label}`}
          </span>
          <span className="text-[12.5px] text-fog">{description}</span>
        </button>
      ))}
      {next && next !== "/" && (
        <p className="text-[12.5px] text-fog">After sign-in you&apos;ll return to {next}.</p>
      )}
      </div>
    </div>
  );
}
