import { AlertCircle } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

const CONTROL_BASE =
  "w-full rounded-[2px] border bg-white px-4 font-sans text-[16px] text-pearl transition-all duration-200 " +
  "placeholder:text-fog/80 hover:border-ink-600 focus:outline-none focus:ring-4 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const CONTROL_STATE = (invalid?: boolean) =>
  invalid
    ? "border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/15"
    : "border-ink-600 focus:border-iris-400 focus:ring-iris-500/15";

export interface FieldProps {
  /** Must match the control's `id` so the label is programmatically linked. */
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
  tone?: "paper" | "night";
}

/**
 * Label + control + hint/error wrapper. The error is rendered in an `aria-live`
 * region and referenced by the control through `aria-describedby`, which is
 * wired up by the caller using the `${id}-error` convention.
 */
export function Field({
  htmlFor,
  label,
  hint,
  error,
  optional,
  className,
  children,
  tone = "paper",
}: FieldProps) {
  const night = tone === "night";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className={cn("text-[13px] font-medium", night ? "text-cream" : "text-pearl-dim")}
        >
          {label}
          {optional && (
            <span className={cn("ml-2 text-[11px] font-normal", night ? "text-haze" : "text-fog")}>
              Optional
            </span>
          )}
        </label>
        {hint && !error && (
          <span className={cn("text-[11px]", night ? "text-haze" : "text-fog")} id={`${htmlFor}-hint`}>
            {hint}
          </span>
        )}
      </div>

      {children}

      <div aria-live="polite" className="min-h-[1.1rem]">
        {error && (
          <p
            id={`${htmlFor}-error`}
            className="flex items-start gap-1.5 text-[12.5px] text-rose-400"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, CONTROL_STATE(invalid), "h-12", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        CONTROL_STATE(invalid),
        "min-h-32 resize-y py-3 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL_BASE,
          CONTROL_STATE(invalid),
          "h-12 cursor-pointer appearance-none pr-11",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-fog"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Live character counter shown beside long-form inputs. */
export function CharCount({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  const tight = remaining < max * 0.1;

  return (
    <span className={cn("mono-ref text-[11px]", tight ? "text-gold-400" : "text-fog")}>
      {value.length}/{max}
    </span>
  );
}
