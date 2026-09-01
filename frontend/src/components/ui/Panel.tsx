import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Frosted surface used for every card, form, and table shell. */
export function Panel({
  children,
  className,
  lit = false,
  tone = "paper",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Adds the iridescent lit top edge — reserve it for the primary panel. */
  lit?: boolean;
  /** Cream paper (default) or Pearl 27 navy instrument card. */
  tone?: "paper" | "night";
}) {
  return (
    <div
      className={cn(
        "relative rounded-[4px]",
        tone === "night" ? "glass-night" : "glass",
        className,
      )}
      {...props}
    >
      {lit && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-iris-400/70 to-transparent"
        />
      )}
      {children}
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-ink-700/70 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-pearl">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-mist">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "paper",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "paper" | "night";
}) {
  const night = tone === "night";
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && (
        <span
          className={cn(
            "grid size-12 place-items-center rounded-[4px] border",
            night
              ? "border-cream/10 bg-night-deep text-iris-400"
              : "border-ink-600 bg-ink-800/60 text-fog",
          )}
        >
          {icon}
        </span>
      )}
      <h3 className={cn("text-[15px] font-semibold", night ? "text-cream" : "text-pearl")}>
        {title}
      </h3>
      {description && (
        <p className={cn("max-w-sm text-sm leading-relaxed", night ? "text-haze" : "text-fog")}>
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
