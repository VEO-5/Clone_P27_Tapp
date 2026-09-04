"use client";

import { useRouter } from "next/navigation";

import { MOCK_ROLES, mockSignIn } from "./mockSession";

/** Mock-mode only: one-click sign-in per role. Replaced by Google SSO when the API ships. */
export function MockSignInButtons({ next }: { next?: string }) {
  const router = useRouter();
  function signInAs(role: (typeof MOCK_ROLES)[number]["role"]) {
    const landing = mockSignIn(role);
    // Respect a deep-link (?next=) when it points at the role's own area.
    if (next && next !== "/" && next.startsWith(landing)) {
      router.push(next);
    } else {
      router.push(landing);
    }
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Mock sign-in roles">
      {MOCK_ROLES.map(({ role, label, description }) => (
        <button
          key={role}
          type="button"
          onClick={() => signInAs(role)}
          className="flex min-h-11 flex-col items-start justify-center rounded-[2px] border border-ink-600 bg-white px-4 py-2 text-left hover:border-iris-400"
        >
          <span className="text-sm font-medium text-pearl">Continue as {label}</span>
          <span className="text-[12.5px] text-fog">{description}</span>
        </button>
      ))}
      {next && next !== "/" && (
        <p className="text-[12.5px] text-fog">After sign-in you&apos;ll return to {next}.</p>
      )}
    </div>
  );
}
