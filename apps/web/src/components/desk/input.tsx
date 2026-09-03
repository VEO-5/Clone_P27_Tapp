import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function DeskInput({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-ink-600 bg-white px-3 py-2 text-sm text-pearl shadow-xs transition-colors placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-iris-500/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
