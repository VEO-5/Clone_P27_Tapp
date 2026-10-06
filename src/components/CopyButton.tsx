"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard permission denied (or insecure context) — leave the UI as is.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label} ${value}`}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[2px] border border-[rgba(27,42,74,0.16)] bg-white px-3.5 text-[12.5px] font-medium text-mist transition-colors hover:border-[rgba(27,42,74,0.28)] hover:text-pearl",
        copied && "border-jade-400/40 text-jade-400",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
