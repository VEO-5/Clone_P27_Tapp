import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-iris-500 text-white shadow-[0_0_0_1px_rgba(232,135,43,0.5),0_8px_20px_-8px_rgba(232,135,43,0.4)] hover:bg-iris-600 hover:-translate-y-px",
  secondary:
    "border border-[rgba(27,42,74,0.16)] bg-white text-pearl hover:border-[rgba(27,42,74,0.28)] hover:bg-ink-900",
  ghost: "text-mist hover:bg-ink-900 hover:text-pearl",
  danger:
    "border border-rose-400/30 bg-rose-400/10 text-rose-400 hover:border-rose-400/50 hover:bg-rose-400/15",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-[2px] px-3.5 text-[13px] font-medium",
  md: "h-11 gap-2 rounded-[2px] px-7 text-sm font-medium",
  lg: "h-12 gap-2 rounded-[2px] px-8 text-[15px] font-medium",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      // `aria-busy` + keeping the button in the DOM means screen readers hear
      // the state change rather than losing focus to a swapped element.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-200",
        "disabled:pointer-events-none disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
}

/**
 * A link that looks like a Button. Kept separate from `Button` so navigation
 * stays a real anchor — middle-click, "open in new tab", and prefetch all work.
 */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-200",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {trailingIcon}
    </Link>
  );
}
