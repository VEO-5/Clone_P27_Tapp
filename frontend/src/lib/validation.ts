import { z } from "zod";

import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "./types";

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES = 5;
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
] as const;

export const ACCEPT_ATTRIBUTE = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt";

/**
 * Single source of truth for ticket intake, used by the client form and by the
 * route handler. Unknown categories/priorities coerce to the default rather
 * than failing the whole submission — the employee shouldn't lose their
 * description because a select was tampered with.
 */
export const createTicketSchema = z.object({
  employeeName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(120, "Name must be 120 characters or fewer"),
  employeeEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your work email address")
    .max(200, "Email must be 200 characters or fewer")
    .email("Enter a valid email address"),
  title: z
    .string()
    .trim()
    .min(5, "Give your issue a short title (at least 5 characters)")
    .max(140, "Title must be 140 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the issue in at least 20 characters so support can help")
    .max(5000, "Description must be 5000 characters or fewer"),
  category: z.preprocess(
    (value) => ((TICKET_CATEGORIES as readonly unknown[]).includes(value) ? value : "other"),
    z.enum(TICKET_CATEGORIES),
  ),
  priority: z.preprocess(
    (value) => ((TICKET_PRIORITIES as readonly unknown[]).includes(value) ? value : "medium"),
    z.enum(TICKET_PRIORITIES),
  ),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    reply: z.string().trim().min(1).max(5000).optional(),
  })
  .refine(
    (value) => Boolean(value.status || value.priority || value.reply),
    "Provide a status, priority, or reply to update",
  );

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const loginSchema = z.object({
  accessCode: z.string().trim().min(1, "Enter the support access code"),
});

export const employeeLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter the work email you used")
    .max(200, "Email must be 200 characters or fewer")
    .email("Enter a valid email address"),
});

export const lookupSchema = z
  .object({
    reference: z.string().optional(),
    email: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.reference?.trim() || value.email?.trim()),
    "Enter a ticket reference or your email address",
  );

// ---------------------------------------------------------------------------
// Attachment validation — shared by the browser upload zone and the API route
// ---------------------------------------------------------------------------

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message, or `null` when the file is acceptable. */
export function validateFile(file: FileLike): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: only PNG, JPEG, WebP, GIF, PDF, or TXT files are allowed`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_FILE_BYTES)}`;
  }
  if (file.size === 0) {
    return `${file.name} is empty`;
  }
  return null;
}

export function validateFiles(files: readonly FileLike[]): string[] {
  const errors: string[] = [];
  if (files.length > MAX_FILES) {
    errors.push(`Attach at most ${MAX_FILES} files`);
  }
  for (const file of files.slice(0, MAX_FILES)) {
    const error = validateFile(file);
    if (error) errors.push(error);
  }
  return errors;
}

/** Flattens a Zod error into `{ field: message }` for rendering under inputs. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] ??= issue.message;
  }
  return result;
}
