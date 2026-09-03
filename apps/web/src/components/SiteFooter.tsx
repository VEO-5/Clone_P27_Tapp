/**
 * Prod footer: brand only. No infrastructure status chips — the web app is
 * UI-only and holds no secrets (Phase 0).
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[rgba(27,42,74,0.12)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 font-mono text-[11px] text-fog sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Pearl 27 · Sphere Support ·{" "}
          <a href="https://pearl27.com/" className="text-mist underline-offset-4 hover:text-pearl hover:underline">
            pearl27.com
          </a>
        </p>
        <p>System Support · Mon–Fri</p>
      </div>
    </footer>
  );
}
