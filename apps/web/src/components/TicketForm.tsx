"use client";

import { createTicketSchema, PRIORITY_LABELS, type Ticket } from "@pearl27/contracts";
import { AlertTriangle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { TicketConfirmation, type UploadState } from "@/components/TicketConfirmation";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/Button";
import { CharCount, Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Panel } from "@/components/ui/Panel";
import { useSession } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";

import { fieldErrorsFromApi, uploadFileWithProgress, type PresignedUpload } from "@/features/tickets/uploads";

const EMPTY_FORM = {
  title: "",
  description: "",
  categoryId: "",
  priority: "medium" as const,
};

type FormValues = typeof EMPTY_FORM;

const TITLE_MAX = 140;
const DESCRIPTION_MAX = 5000;

function flattenZod(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

export function TicketForm() {
  const session = useSession();
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ticket: Ticket; uploads: UploadState[] } | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ id: string; name: string }[]>("/categories")
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
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
    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const reset = () => {
    setValues(EMPTY_FORM);
    setFiles([]);
    setErrors({});
    setFormError(null);
    setResult(null);
  };

  async function uploadOne(ticketId: string, file: File, onProgress: (p: number) => void): Promise<UploadState> {
    const base: UploadState = { fileName: file.name, status: "uploading", progress: 0 };
    try {
      const presigned = await apiFetch<PresignedUpload>(`/tickets/${ticketId}/attachments/presign`, {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      await uploadFileWithProgress(presigned.uploadUrl, file, onProgress);
      await apiFetch(`/tickets/${ticketId}/attachments/${presigned.attachmentId}/complete`, { method: "POST" });
      return { ...base, status: "done", progress: 100 };
    } catch {
      return { ...base, status: "error", progress: 0 };
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return; // double-submit protection (FE-2.8)
    setFormError(null);

    const parsed = createTicketSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = flattenZod(parsed.error);
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      // 1. Create the ticket first — uploads never block the ticket itself.
      const ticket = await apiFetch<Ticket>("/tickets", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });

      // 2. Upload files one by one with per-file progress. Failures keep the
      // ticket and surface per-file with a retry (FE-2.7).
      const uploads: UploadState[] = files.map((file) => ({
        fileName: file.name,
        status: "uploading" as const,
        progress: 0,
      }));
      setResult({ ticket, uploads });

      await Promise.all(
        files.map(async (file, index) => {
          const state = await uploadOne(ticket.id, file, (progress) => {
            setResult((current) => {
              if (!current) return current;
              const next = [...current.uploads];
              next[index] = { ...next[index]!, progress };
              return { ...current, uploads: next };
            });
          });
          setResult((current) => {
            if (!current) return current;
            const next = [...current.uploads];
            next[index] = state;
            return { ...current, uploads: next };
          });
        }),
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const fieldErrors = fieldErrorsFromApi(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        focusFirstError(fieldErrors);
      } else {
        setFormError(error instanceof Error ? error.message : "We couldn't submit your ticket. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  async function retryUpload(index: number) {
    if (!result) return;
    const file = files[index];
    if (!file) return;
    setResult((current) => {
      if (!current) return current;
      const next = [...current.uploads];
      next[index] = { ...next[index]!, status: "uploading", progress: 0 };
      return { ...current, uploads: next };
    });
    const state = await uploadOne(result.ticket.id, file, (progress) => {
      setResult((current) => {
        if (!current) return current;
        const next = [...current.uploads];
        next[index] = { ...next[index]!, progress };
        return { ...current, uploads: next };
      });
    });
    setResult((current) => {
      if (!current) return current;
      const next = [...current.uploads];
      next[index] = state;
      return { ...current, uploads: next };
    });
  }

  if (result) {
    return <TicketConfirmation ticket={result.ticket} uploads={result.uploads} onRetry={retryUpload} onReset={reset} />;
  }

  return (
    <Panel lit id="new-ticket" className="scroll-mt-24">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col">
        <div className="border-b border-ink-700/70 px-6 py-6 sm:px-8">
          <p className="eyebrow mb-2">New support request</p>
          <h2 className="text-xl font-semibold tracking-tight text-pearl">
            Tell us what&apos;s happening
          </h2>
          {session.data && (
            <p className="mt-1.5 text-sm text-mist" aria-live="polite">
              Submitting as {session.data.name} · {session.data.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 px-6 py-6 sm:px-8">
          <Field htmlFor="title" label="Issue title" error={errors.title} hint={`${values.title.length}/${TITLE_MAX}`}>
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
            <Field htmlFor="categoryId" label="What does this relate to?" error={errors.categoryId}>
              <Select
                id="categoryId"
                name="categoryId"
                value={values.categoryId}
                onChange={(event) => set("categoryId", event.target.value)}
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="priority" label="How urgent is it?">
              <Select
                id="priority"
                name="priority"
                value={values.priority}
                onChange={(event) => set("priority", event.target.value as FormValues["priority"])}
              >
                {(Object.keys(PRIORITY_LABELS) as (keyof typeof PRIORITY_LABELS)[]).map((priority) => (
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

          <Field htmlFor="files" label="Screenshots or files" optional error={errors.files} className="mt-1">
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
