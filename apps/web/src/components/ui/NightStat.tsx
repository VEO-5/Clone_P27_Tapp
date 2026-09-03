import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const SHELL =
  "rounded-[4px] border border-cream/10 bg-night px-4 py-3.5 text-left shadow-[0_12px_32px_-18px_rgba(16,24,40,0.55)]";

export function NightStat({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(SHELL, className)}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 font-display text-2xl text-cream sm:text-3xl">{value}</dd>
    </div>
  );
}

export function NightStatButton({
  label,
  value,
  active = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  value: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        SHELL,
        "min-h-11 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-iris-500/25",
        active ? "border-iris-400/60 bg-night-deep" : "hover:border-cream/20",
        className,
      )}
      {...props}
    >
      <span className="eyebrow">{label}</span>
      <span className="mt-2 block font-display text-2xl text-cream sm:text-3xl">{value}</span>
    </button>
  );
}
