import { AlertCircle } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { Input as ShadcnInput } from "@/components/shadcn/input";
import { Label as ShadcnLabel } from "@/components/shadcn/label";
import { Textarea as ShadcnTextarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/utils";

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
        <ShadcnLabel
          htmlFor={htmlFor}
          className={cn(night ? "text-cream" : "text-pearl-dim")}
        >
          {label}
          {optional && (
            <span className={cn("ml-2 text-[11px] font-normal", night ? "text-haze" : "text-fog")}>
              Optional
            </span>
          )}
        </ShadcnLabel>
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
            className="flex items-start gap-1.5 text-[12.5px] text-destructive"
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
    <ShadcnInput
      aria-invalid={invalid || undefined}
      className={cn(invalid && "border-destructive", className)}
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
    <ShadcnTextarea
      aria-invalid={invalid || undefined}
      className={cn(invalid && "border-destructive", className)}
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
  // Deliberately native (not the Radix registry Select): it stays keyboard-
  // and screen-reader-perfect in every browser, and Radix floating layers
  // can't be unit-tested in jsdom. Styled to match the registry controls.
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-md border bg-background pr-9 pl-3 py-1 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          invalid ? "border-destructive" : "border-input",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
    <span className={cn("mono-ref text-[11px]", tight ? "text-iris-700" : "text-fog")}>
      {value.length}/{max}
    </span>
  );
}