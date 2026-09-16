import type { RoleName } from "@/lib/auth";

/**
 * 403 page: role gate failed, but never a crash. Links back to safety.
 * MIRROR note: plain <a> instead of router Link — backHref is a runtime
 * string, and typed router links only accept known routes (see md §4.1 note
 * on href vs to). Same pixels, no type lie.
 */
export function Forbidden({
  role,
  allowed,
  backHref,
  backLabel,
}: {
  role?: RoleName | null;
  allowed: readonly RoleName[];
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="eyebrow">403 · Not for your role</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight text-pearl">
        You can&apos;t open this screen
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mist">
        {role ? (
          <>
            This area is for <strong>{allowed.join(", ")}</strong>. You&apos;re signed in as{" "}
            <strong>{role}</strong>.
          </>
        ) : (
          <>This area is for {allowed.join(", ")}. Sign in to continue.</>
        )}
      </p>
      <a
        href={backHref}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[2px] bg-iris-500 px-7 text-sm font-medium text-white"
      >
        {backLabel}
      </a>
    </div>
  );
}
