"use client";

import { AlertTriangle, Send } from "lucide-react";
import { useRef, useState } from "react";

import { TicketConfirmation } from "@/components/TicketConfirmation";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/Button";
import { CharCount, Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketDetail,
} from "@/lib/types";
import { createTicketSchema, fieldErrorsFrom } from "@/lib/validation";

const EMPTY_FORM = {
  employeeName: "",
  employeeEmail: "",
  title: "",
  description: "",
  category: "account_access",
  priority: "medium",
};

type FormValues = typeof EMPTY_FORM;

const TITLE_MAX = 140;
const DESCRIPTION_MAX = 5000;

export function TicketForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ticket: TicketDetail; emailSent: boolean } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the field's error as soon as the employee starts fixing it.
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const focusFirstError = (fieldErrors: Record<string, string>) => {
    const first = Object.keys(fieldErrors)[0];
    if (!first) return;
    formRef.current
      ?.querySelector<HTMLElement>(`[name="${first}"]`)
      ?.focus({ preventScroll: false });
  };

  const reset = () => {
    setValues(EMPTY_FORM);
    setFiles([]);
    setErrors({});
    setFormError(null);
    setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    // Same schema the API uses — instant feedback, single definition of "valid".
    const parsed = createTicketSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsFrom(parsed.error);
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const body = new FormData();
      Object.entries(parsed.data).forEach(([key, value]) => body.append(key, String(value)));
      files.forEach((file) => body.append("files", file));

      const response = await fetch("/api/tickets", { method: "POST", body });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors(payload?.fieldErrors ?? {});
        setFormError(payload?.error ?? "We couldn't submit your ticket. Please try again.");
        if (payload?.fieldErrors) focusFirstError(payload.fieldErrors);
        return;
      }

      setResult({ ticket: payload.ticket, emailSent: Boolean(payload.emailSent) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <TicketConfirmation
        ticket={result.ticket}
        emailSent={result.emailSent}
        onReset={reset}
      />
    );
  }

  return (
    <Panel lit id="new-ticket" className="scroll-mt-24">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col">
        <div className="border-b border-ink-700/70 px-6 py-6 sm:px-8">
          <p className="eyebrow mb-2">New support request</p>
          <h2 className="text-xl font-semibold tracking-tight text-pearl">
            Tell us what&apos;s happening
          </h2>
          <p className="mt-1.5 text-sm text-mist">
            The more detail you give, the faster System Support can resolve it.
          </p>
        </div>

        <div className="flex flex-col gap-1 px-6 py-6 sm:px-8">
          <div className="grid gap-x-5 sm:grid-cols-2">
            <Field htmlFor="employeeName" label="Your name" error={errors.employeeName}>
              <Input
                id="employeeName"
                name="employeeName"
                autoComplete="name"
                placeholder="Godstime Erubami"
                value={values.employeeName}
                invalid={Boolean(errors.employeeName)}
                aria-describedby={errors.employeeName ? "employeeName-error" : undefined}
                onChange={(event) => set("employeeName", event.target.value)}
              />
            </Field>

            <Field htmlFor="employeeEmail" label="Work email" error={errors.employeeEmail}>
              <Input
                id="employeeEmail"
                name="employeeEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@pearl27.com"
                value={values.employeeEmail}
                invalid={Boolean(errors.employeeEmail)}
                aria-describedby={errors.employeeEmail ? "employeeEmail-error" : undefined}
                onChange={(event) => set("employeeEmail", event.target.value)}
              />
            </Field>
          </div>

          <Field
            htmlFor="title"
            label="Issue title"
            error={errors.title}
            hint={`${values.title.length}/${TITLE_MAX}`}
          >
            <Input
              id="title"
              name="title"
              maxLength={TITLE_MAX}
              placeholder="Can't sign in to my Sphere account"
              value={values.title}
              invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>

          <div className="grid gap-x-5 sm:grid-cols-2">
            <Field htmlFor="category" label="What does this relate to?">
              <Select
                id="category"
                name="category"
                value={values.category}
                onChange={(event) => set("category", event.target.value)}
              >
                {TICKET_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="priority" label="How urgent is it?">
              <Select
                id="priority"
                name="priority"
                value={values.priority}
                onChange={(event) => set("priority", event.target.value)}
              >
                {TICKET_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                    {priority === "urgent" ? " — I can't work" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field htmlFor="description" label="Describe the issue" error={errors.description}>
            <Textarea
              id="description"
              name="description"
              rows={6}
              maxLength={DESCRIPTION_MAX}
              placeholder="What were you trying to do? What did you see? Any error message? Which device or browser?"
              value={values.description}
              invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : undefined}
              onChange={(event) => set("description", event.target.value)}
            />
            <div className="flex justify-end">
              <CharCount value={values.description} max={DESCRIPTION_MAX} />
            </div>
          </Field>

          <Field
            htmlFor="files"
            label="Screenshots or files"
            optional
            error={errors.files}
            className="mt-1"
          >
            <UploadZone files={files} onChange={setFiles} disabled={submitting} />
          </Field>
        </div>

        <div className="flex flex-col gap-4 border-t border-ink-700/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div aria-live="assertive" className="min-h-5 flex-1">
            {formError && (
              <p className="flex items-start gap-2 text-[13px] text-rose-400">
                <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
                {formError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            icon={<Send className="size-4" aria-hidden />}
            className="w-full sm:w-auto"
          >
            {submitting ? "Submitting…" : "Submit ticket"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
