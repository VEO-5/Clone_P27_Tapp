import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../env";
import { generateReference } from "../reference";
import type { Ticket, TicketAttachment, TicketDetail, TicketStats } from "../types";
import type { CreateTicketInput, UpdateTicketInput } from "../validation";
import { planUpdate } from "../workflow";
import {
  computeStats,
  type AttachmentTarget,
  type TicketFilter,
  type TicketRepository,
  type UpdateResult,
  type UploadFile,
} from "./types";

/**
 * Supabase-backed storage. Uses the service-role key, so this module must never
 * be imported from a client component — it is only reachable from route
 * handlers and server components.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const UNIQUE_VIOLATION = "23505";

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /Could not find the table/i.test(error.message ?? "") ||
    /relation .+ does not exist/i.test(error.message ?? "")
  );
}

function schemaHint(): Error {
  return new Error(
    "The Supabase tables are not set up yet. In the Supabase dashboard open SQL Editor, paste supabase/schema.sql, and run it once.",
  );
}

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    const url = env.supabaseUrl;
    const key = env.supabaseServiceRoleKey;
    if (!url || !key) {
      throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// --- row mapping -----------------------------------------------------------

interface TicketRow {
  id: string;
  reference: string;
  employee_name: string;
  employee_email: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    reference: row.reference,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    title: row.title,
    description: row.description,
    category: row.category as Ticket["category"],
    status: row.status as Ticket["status"],
    priority: row.priority as Ticket["priority"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

const TICKET_COLUMNS =
  "id, reference, employee_name, employee_email, title, description, category, status, priority, created_at, updated_at, resolved_at";

async function loadDetail(ticket: Ticket): Promise<TicketDetail> {
  const [attachments, events] = await Promise.all([
    db()
      .from("ticket_attachments")
      .select("id, ticket_id, file_name, storage_path, mime_type, size_bytes, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
    db()
      .from("ticket_events")
      .select("id, ticket_id, type, message, actor, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    ...ticket,
    attachments: (attachments.data ?? []).map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      fileName: row.file_name,
      storagePath: row.storage_path,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      createdAt: row.created_at,
    })),
    events: (events.data ?? []).map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      type: row.type,
      message: row.message,
      actor: row.actor,
      createdAt: row.created_at,
    })),
  };
}

// --- repository ------------------------------------------------------------

export const supabaseRepository: TicketRepository = {
  kind: "supabase",

  async createTicket(input: CreateTicketInput, files: UploadFile[]): Promise<TicketDetail> {
    let row: TicketRow | null = null;

    // The unique index on `reference` is the source of truth; retry on collision.
    for (let attempt = 0; attempt < 5 && !row; attempt += 1) {
      const { data, error } = await db()
        .from("tickets")
        .insert({
          reference: generateReference(),
          employee_name: input.employeeName,
          employee_email: input.employeeEmail,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: "open",
        })
        .select(TICKET_COLUMNS)
        .single();

      if (error) {
        if (error.code === UNIQUE_VIOLATION) continue;
        if (isMissingRelation(error)) throw schemaHint();
        throw new Error(`Could not create ticket: ${error.message}`);
      }
      row = data as TicketRow;
    }

    if (!row) throw new Error("Could not allocate a unique ticket reference");
    const ticket = toTicket(row);

    await db().from("ticket_events").insert({
      ticket_id: ticket.id,
      type: "created",
      message: "Ticket submitted to the System Support team",
      actor: "employee",
    });

    for (const file of files) {
      const storagePath = `${ticket.id}/${Date.now()}-${file.fileName.replace(/[^\w.\-]+/g, "_")}`;
      const upload = await db()
        .storage.from(env.supabaseBucket)
        .upload(storagePath, file.bytes, { contentType: file.mimeType, upsert: false });

      if (upload.error) {
        // A failed screenshot must not lose the ticket the employee just wrote.
        console.error("[supabase] attachment upload failed", upload.error.message);
        continue;
      }

      await db().from("ticket_attachments").insert({
        ticket_id: ticket.id,
        file_name: file.fileName,
        storage_path: storagePath,
        mime_type: file.mimeType,
        size_bytes: file.bytes.byteLength,
      });
    }

    return loadDetail(ticket);
  },

  async getTicketByReference(reference: string): Promise<TicketDetail | null> {
    const { data, error } = await db()
      .from("tickets")
      .select(TICKET_COLUMNS)
      .ilike("reference", reference)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) return null;
      throw new Error(`Could not load ticket: ${error.message}`);
    }
    return data ? loadDetail(toTicket(data as TicketRow)) : null;
  },

  async getTicketById(id: string): Promise<TicketDetail | null> {
    const { data, error } = await db()
      .from("tickets")
      .select(TICKET_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) return null;
      throw new Error(`Could not load ticket: ${error.message}`);
    }
    return data ? loadDetail(toTicket(data as TicketRow)) : null;
  },

  async listTicketsByEmail(email: string): Promise<Ticket[]> {
    const { data, error } = await db()
      .from("tickets")
      .select(TICKET_COLUMNS)
      .ilike("employee_email", email.trim())
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingRelation(error)) return [];
      throw new Error(`Could not load tickets: ${error.message}`);
    }
    return (data as TicketRow[]).map(toTicket);
  },

  async listTickets(filter?: TicketFilter): Promise<Ticket[]> {
    let query = db().from("tickets").select(TICKET_COLUMNS).order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") query = query.eq("status", filter.status);
    if (filter?.priority && filter.priority !== "all") query = query.eq("priority", filter.priority);

    const search = filter?.search?.trim();
    if (search) {
      const term = `%${search.replace(/[%,]/g, "")}%`;
      query = query.or(
        `reference.ilike.${term},employee_name.ilike.${term},employee_email.ilike.${term},title.ilike.${term}`,
      );
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingRelation(error)) return [];
      throw new Error(`Could not load tickets: ${error.message}`);
    }
    return (data as TicketRow[]).map(toTicket);
  },

  async updateTicket(id: string, input: UpdateTicketInput): Promise<UpdateResult | null> {
    const existing = await this.getTicketById(id);
    if (!existing) return null;

    const { patch, events, notifyResolved } = planUpdate(existing, input);

    if (Object.keys(patch).length > 0 || events.length > 0) {
      const { error } = await db()
        .from("tickets")
        .update({
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.priority ? { priority: patch.priority } : {}),
          ...(patch.resolvedAt !== undefined ? { resolved_at: patch.resolvedAt } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(`Could not update ticket: ${error.message}`);
    }

    if (events.length > 0) {
      const base = Date.now();
      const { error } = await db()
        .from("ticket_events")
        .insert(
          events.map((event, offset) => ({
            ticket_id: id,
            type: event.type,
            message: event.message,
            actor: event.actor,
            created_at: new Date(base + offset).toISOString(),
          })),
        );

      if (error) throw new Error(`Could not record ticket history: ${error.message}`);
    }

    const ticket = await this.getTicketById(id);
    return ticket ? { ticket, notifyResolved } : null;
  },

  async getStats(): Promise<TicketStats> {
    const { data, error } = await db().from("tickets").select("status");
    if (error) {
      if (isMissingRelation(error)) return computeStats([]);
      throw new Error(`Could not load stats: ${error.message}`);
    }
    return computeStats((data as Pick<Ticket, "status">[]).map((row) => row as Ticket));
  },

  async resolveAttachment(id: string): Promise<AttachmentTarget | null> {
    const { data, error } = await db()
      .from("ticket_attachments")
      .select("id, ticket_id, file_name, storage_path, mime_type, size_bytes, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    const attachment = data as {
      file_name: string;
      storage_path: string;
      mime_type: string;
    } & Partial<TicketAttachment>;

    const signed = await db()
      .storage.from(env.supabaseBucket)
      .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signed.error || !signed.data) return null;

    return {
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      signedUrl: signed.data.signedUrl,
    };
  },
};
