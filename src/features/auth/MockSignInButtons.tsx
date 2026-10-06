import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { landingTarget, MOCK_ROLES, mockSignIn } from "./mockSession";
import { queryKeys } from "@/lib/query";

/**
 * Mock-mode only: one-click role quick-pick. Replaced by the real API when it ships.
 * MIRROR note: EmailSignInForm + DemoResetButton land with the component port;
 * the quick-pick buttons are what the E2E specs click (Ada/Kofi/Admin).
 * Next useRouter().push -> TanStack navigate({ to }).
 */
export function MockSignInButtons({ next }: { next?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingRole, setSigningRole] = useState<(typeof MOCK_ROLES)[number]["role"] | null>(null);

  async function signInAs(role: (typeof MOCK_ROLES)[number]["role"]) {
    if (signingRole) return;
    setSigningRole(role);
    try {
      const { landing, profile } = await mockSignIn(role);
      // Bust the Infinity-cached session so gates read the new role, not the
      // profile fetched on the sign-in page load.
      if (profile) queryClient.setQueryData(queryKeys.me, profile);
      else await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      const target = landingTarget(next, landing);
      // Runtime string, statically one of the landings or the ?next= path the
      // user was already heading to (md §4.1: fully-built targets keep working
      // as strings; the type cast is compile-time only).
      await navigate({ to: target as "/tickets" });
    } finally {
      setSigningRole(null);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12px] uppercase tracking-[0.12em] text-fog">Quick demo sign-in</p>
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
