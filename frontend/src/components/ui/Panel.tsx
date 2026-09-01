import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Frosted surface used for every card, form, and table shell. */
export function Panel({
  children,
  className,
  lit = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Adds the iridescent lit top edge — reserve it for the primary panel. */
  lit?: boolean;
}) {
  return (
    <div className={cn("glass relative rounded-[4px]", className)} {...props}>
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
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && (
        <span className="grid size-12 place-items-center rounded-2xl border border-ink-600 bg-ink-800/60 text-fog">
          {icon}
        </span>
      )}
      <h3 className="text-[15px] font-semibold text-pearl">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-relaxed text-fog">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
