"use client";

import { createTicketSchema, type Ticket } from "@pearl27/contracts";
import { useRef, useState } from "react";
import { z } from "zod";

import { useSession } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";
import { maybeCompressImage } from "@/lib/image-compress";
import { validateFile } from "@/lib/validation";

import { useCategories } from "./categories";

import type { UploadState } from "./UploadStatusList";
import { fieldErrorsFromApi, uploadFileWithProgress, type PresignedUpload } from "./uploads";

export const TITLE_MAX = 140;
export const DESCRIPTION_MAX = 5000;

const EMPTY_FORM = {
  title: "",
  description: "",
  categoryId: "",
  priority: "medium" as const,
};

export type TicketFormValues = typeof EMPTY_FORM;

function flattenZod(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/**
 * Submit engine for the new-ticket form. State lives in the hook owner —
 * the page owns one instance, the slide-over owns one — so a centered
 * success popup rendered outside the slide-over keeps live upload
 * progress + retry even after the slide-over unmounts.
 */
export function useTicketSubmit() {
  const session = useSession();
  const [values, setValues] = useState<TicketFormValues>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ticket: Ticket; uploads: UploadState[] } | null>(null);
  // Categories come from the shared ["categories"] cache (see
  // features/tickets/categories.ts), so admin renames/removes propagate to
  // every form — including slide-overs mounted long before the edit — as
  // soon as CategoryManager invalidates the key.
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];
  const categoriesError = categoriesQuery.isError
    ? "Couldn't load categories. Check your connection and try again."
    : null;

  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof TicketFormValues>(key: K, value: TicketFormValues[K]) => {
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
    // File input is sr-only but focusable — focusing it announces the error.
    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const handleFilesChange = (next: File[]) => {
    setFiles(next);
    setErrors((current) => {
      if (!current.files) return current;
      const nextErrors = { ...current };
      delete nextErrors.files;
      return nextErrors;
    });
  };

  const reset = () => {
    setValues(EMPTY_FORM);
    setFiles([]);
    setErrors({});
    setFormError(null);
    setResult(null);
  };

  const reloadCategories = () => {
    void categoriesQuery.refetch();
  };

  async function uploadOne(ticketId: string, file: File, onProgress: (p: number) => void): Promise<UploadState> {
    const base: UploadState = { fileName: file.name, status: "uploading", progress: 0 };
    try {
      // Large photos are downscaled to a triage-friendly JPEG first, so an
      // oversize phone screenshot uploads instead of failing the 5 MB cap.
      const { file: effective, compressed } = await maybeCompressImage(file);
      const validationError = validateFile(effective);
      if (validationError) {
        return { ...base, fileName: effective.name, status: "error", progress: 0, message: validationError };
      }
      const presigned = await apiFetch<PresignedUpload>(`/tickets/${ticketId}/attachments/presign`, {
        method: "POST",
        body: JSON.stringify({ fileName: effective.name, mimeType: effective.type, sizeBytes: effective.size }),
      });
      await uploadFileWithProgress(presigned.uploadUrl, effective, onProgress, presigned.headers ?? {}, {
        method: presigned.method,
        fields: presigned.fields,
      });
      await apiFetch(`/tickets/${ticketId}/attachments/${presigned.attachmentId}/complete`, { method: "POST" });
      return { ...base, fileName: effective.name, status: "done", progress: 100, compressed };
    } catch (error) {
      return {
        ...base,
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "Upload failed — check your connection and retry.",
      };
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return; // double-submit protection (FE-2.8)
    setFormError(null);

    const parsed = createTicketSchema.safeParse(values);
    const fieldErrors: Record<string, string> = parsed.success ? {} : flattenZod(parsed.error);
    // Screenshots/files are required — support triages from the visual, and
    // the confirmation screen assumes at least one attachment slot. Listed
    // after the text fields so focus still lands on the title first.
    if (files.length === 0) {
      fieldErrors.files ??= "Attach at least one screenshot or file so support can see the issue.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }
    // Unreachable: a failed parse always yields field errors. Keeps narrowing
    // so parsed.data is safe below.
    if (!parsed.success) return;
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
    } catch (error) {
      const apiFieldErrors = fieldErrorsFromApi(error);
      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors(apiFieldErrors);
        focusFirstError(apiFieldErrors);
      } else if (error instanceof TypeError || (error instanceof Error && /failed to fetch|network/i.test(error.message))) {
        setFormError("Couldn't reach support — check your connection and try again.");
        formRef.current?.querySelector<HTMLElement>('[data-form-error]')?.focus();
      } else {
        setFormError(error instanceof Error ? error.message : "We couldn't submit your ticket. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  async function retryUpload(index: number) {
    if (!result) return;
    const current = result.uploads[index];
    if (!current || current.status === "uploading") return;
    const file = files[index];
    if (!file) return;
    setResult((prev) => {
      if (!prev) return prev;
      const next = [...prev.uploads];
      next[index] = { ...next[index]!, status: "uploading", progress: 0 };
      return { ...prev, uploads: next };
    });
    const state = await uploadOne(result.ticket.id, file, (progress) => {
      setResult((prev) => {
        if (!prev) return prev;
        const next = [...prev.uploads];
        next[index] = { ...next[index]!, progress };
        return { ...prev, uploads: next };
      });
    });
    setResult((prev) => {
      if (!prev) return prev;
      const next = [...prev.uploads];
      next[index] = state;
      return { ...prev, uploads: next };
    });
  }

  return {
    session,
    values,
    set,
    files,
    handleFilesChange,
    errors,
    formError,
    submitting,
    result,
    categories,
    categoriesError,
    reloadCategories,
    formRef,
    handleSubmit,
    retryUpload,
    reset,
  };
}

export type TicketSubmitController = ReturnType<typeof useTicketSubmit>;
