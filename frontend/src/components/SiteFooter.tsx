import { capabilities } from "@/lib/env";

/**
 * Also acts as a tiny runtime status strip: at a glance you can see whether the
 * hosted database and email provider are wired up, which makes the demo
 * self-explanatory instead of silently degrading.
 */
export function SiteFooter() {
  const { storage, email } = capabilities();

  const chips = [
    {
      label: storage === "supabase" ? "Supabase connected" : "Local store (dev fallback)",
      live: storage === "supabase",
    },
    {
      label: email === "resend" ? "Email notifications on" : "Email in log-only mode",
      live: email === "resend",
    },
  ];

  return (
    <footer className="mt-24 border-t border-[rgba(27,42,74,0.12)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 font-mono text-[11px] text-fog sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Pearl 27 · Sphere Support ·{" "}
          <a href="https://pearl27.com/" className="text-mist underline-offset-4 hover:text-pearl hover:underline">
            pearl27.com
          </a>
        </p>
        <ul className="flex flex-wrap items-center gap-4">
          {chips.map((chip) => (
            <li key={chip.label} className="flex items-center gap-2">
              <span
                className={
                  chip.live
                    ? "size-1.5 rounded-full bg-jade-400 shadow-[0_0_8px] shadow-jade-400/70"
                    : "size-1.5 rounded-full bg-gold-400 shadow-[0_0_8px] shadow-gold-400/60"
                }
              />
              {chip.label}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
