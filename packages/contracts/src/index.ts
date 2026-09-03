import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums — single source of truth. The web app never hard-codes these.
// ---------------------------------------------------------------------------

export const TicketStatus = z.enum(["pending", "open", "in_progress", "resolved"]);
export type TicketStatus = z.infer<typeof TicketStatus>;

export const TicketPriority = z.enum(["low", "medium", "high", "urgent"]);
export type TicketPriority = z.infer<typeof TicketPriority>;

export const Role = z.enum(["employee", "agent", "admin"]);
export type Role = z.infer<typeof Role>;

export const EventType = z.enum([
  "created",
  "status_changed",
  "reopened",
  "resolved",
  "message",
  "internal_note",
  "assigned",
  "released",
]);
export type EventType = z.infer<typeof EventType>;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "Pending",
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const ALLOWED_DOMAIN = "pearl27.com";

// Categories (Phase 6 adds formSchema for dynamic fields)
export const Category = z.object({
  id: z.string(),
  name: z.string(),
  formSchema: z.unknown().optional(),
});
export type Category = z.infer<typeof Category>;

// ---------------------------------------------------------------------------
// Domain shapes
// ---------------------------------------------------------------------------

export const Profile = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  role: Role,
  teamId: z.string().nullable().optional(),
});
export type Profile = z.infer<typeof Profile>;

export const Ticket = z.object({
  id: z.string(),
  reference: z.string(),
  title: z.string(),
  description: z.string(),
  categoryId: z.string(),
  status: TicketStatus,
  priority: TicketPriority,
  requesterId: z.string(),
  assigneeId: z.string().nullable().optional(),
  handlingAgent: z
    .object({ name: z.string(), avatarUrl: z.string().url().nullable().optional() })
    .nullable()
    .optional(),
  chatDmUrl: z.string().url().nullable().optional(),
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Ticket = z.infer<typeof Ticket>;

export const Message = z.object({
  id: z.string(),
  ticketId: z.string(),
  authorRole: z.enum(["employee", "agent", "system"]),
  text: z.string(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof Message>;

export const TicketEvent = z.object({
  id: z.string(),
  ticketId: z.string(),
  type: EventType,
  message: z.string().optional(),
  actor: z.string().optional(),
  createdAt: z.string(),
});
export type TicketEvent = z.infer<typeof TicketEvent>;

export const Attachment = z.object({
  id: z.string(),
  ticketId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  status: z.enum(["scanning", "available", "failed"]).optional(),
  createdAt: z.string(),
});
export type Attachment = z.infer<typeof Attachment>;

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// ---------------------------------------------------------------------------
// Request schemas (client + API validate with the same schemas)
// ---------------------------------------------------------------------------

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
] as const;

export const createTicketSchema = z.object({
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
  categoryId: z.string().min(1, "Choose a category"),
  priority: TicketPriority.default("medium"),
  customFields: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const sendSchema = z
  .object({
    text: z.string().trim().min(1).max(5000).optional(),
    status: z.enum(["open", "in_progress", "resolved"]).optional(),
    internal: z.boolean().optional(),
    priority: TicketPriority.optional(),
    version: z.number().int().nonnegative(),
  })
  .refine((v) => Boolean(v.text || v.status || v.priority), {
    message: "Provide a message, status, or priority",
  });
export type SendInput = z.infer<typeof sendSchema>;

export const agentEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .refine((v) => v.endsWith(`@${ALLOWED_DOMAIN}`), {
      message: `Use your ${ALLOWED_DOMAIN} address`,
    }),
});

export function validateFile(file: { name: string; size: number; type: string }): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: only PNG, JPEG, WebP, GIF, PDF, or TXT files are allowed`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is too large — the limit is 5 MB`;
  }
  if (file.size === 0) return `${file.name} is empty`;
  return null;
}

export function validateFiles(files: readonly { name: string; size: number; type: string }[]): string[] {
  const errors: string[] = [];
  if (files.length > MAX_FILES) errors.push(`Attach at most ${MAX_FILES} files`);
  for (const file of files.slice(0, MAX_FILES)) {
    const error = validateFile(file);
    if (error) errors.push(error);
  }
  return errors;
}
