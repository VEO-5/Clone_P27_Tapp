import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Ticket, TicketAttachment, TicketDetail, TicketEvent, TicketStats } from "../types";
import type { CreateTicketInput, UpdateTicketInput } from "../validation";
import { generateReference } from "../reference";
import { planUpdate } from "../workflow";
import {
  computeStats,
  matchesFilter,
  type AttachmentTarget,
  type TicketFilter,
  type TicketRepository,
  type UpdateResult,
  type UploadFile,
} from "./types";

/**
 * Zero-config fallback store: JSON on disk under `.data/`, screenshots written
 * beside it. This exists so the app is demoable and reviewable the moment it is
 * cloned — before any Supabase project has been provisioned. Production uses the
 * Supabase repository; see `supabase.ts`.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "tickets.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

interface Database {
  tickets: Ticket[];
  attachments: TicketAttachment[];
  events: TicketEvent[];
}

const EMPTY: Database = { tickets: [], attachments: [], events: [] };

/**
 * Serialises read-modify-write cycles so two concurrent submissions can't
 * clobber each other's writes.
 */
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.catch(() => undefined);
  return result;
}

async function load(): Promise<Database> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    return {
      tickets: parsed.tickets ?? [],
      attachments: parsed.attachments ?? [],
      events: parsed.events ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

async function save(db: Database): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function newestFirst(a: Ticket, b: Ticket): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function detail(db: Database, ticket: Ticket): TicketDetail {
  return {
    ...ticket,
    attachments: db.attachments.filter((a) => a.ticketId === ticket.id),
    events: db.events
      .filter((e) => e.ticketId === ticket.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export const localRepository: TicketRepository = {
  kind: "local",

  async createTicket(input: CreateTicketInput, files: UploadFile[]): Promise<TicketDetail> {
    return withLock(async () => {
      const db = await load();
      const now = new Date().toISOString();

      let reference = generateReference();
      while (db.tickets.some((t) => t.reference === reference)) {
        reference = generateReference();
      }

      const ticket: Ticket = {
        id: randomUUID(),
        reference,
        employeeName: input.employeeName,
        employeeEmail: input.employeeEmail,
        title: input.title,
        description: input.description,
        category: input.category,
        status: "open",
        priority: input.priority,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      };

      db.tickets.push(ticket);
      db.events.push({
        id: randomUUID(),
        ticketId: ticket.id,
        type: "created",
        message: "Ticket submitted to the System Support team",
        actor: "employee",
        createdAt: now,
      });

      if (files.length > 0) {
        await mkdir(UPLOAD_DIR, { recursive: true });
        for (const file of files) {
          const attachmentId = randomUUID();
          const safeName = file.fileName.replace(/[^\w.\-]+/g, "_");
          const storagePath = `${attachmentId}-${safeName}`;
          await writeFile(path.join(UPLOAD_DIR, storagePath), file.bytes);
          db.attachments.push({
            id: attachmentId,
            ticketId: ticket.id,
            fileName: file.fileName,
            storagePath,
            mimeType: file.mimeType,
            sizeBytes: file.bytes.byteLength,
            createdAt: now,
          });
        }
      }

      await save(db);
      return detail(db, ticket);
    });
  },

  async getTicketByReference(reference: string): Promise<TicketDetail | null> {
    const db = await load();
    const ticket = db.tickets.find(
      (t) => t.reference.toUpperCase() === reference.toUpperCase(),
    );
    return ticket ? detail(db, ticket) : null;
  },

  async getTicketById(id: string): Promise<TicketDetail | null> {
    const db = await load();
    const ticket = db.tickets.find((t) => t.id === id);
    return ticket ? detail(db, ticket) : null;
  },

  async listTicketsByEmail(email: string): Promise<Ticket[]> {
    const db = await load();
    const needle = email.trim().toLowerCase();
    return db.tickets
      .filter((t) => t.employeeEmail.toLowerCase() === needle)
      .sort(newestFirst);
  },

  async listTickets(filter?: TicketFilter): Promise<Ticket[]> {
    const db = await load();
    return db.tickets.filter((t) => matchesFilter(t, filter)).sort(newestFirst);
  },

  async updateTicket(id: string, input: UpdateTicketInput): Promise<UpdateResult | null> {
    return withLock(async () => {
      const db = await load();
      const index = db.tickets.findIndex((t) => t.id === id);
      if (index === -1) return null;

      const existing = db.tickets[index];
      const { patch, events, notifyResolved } = planUpdate(existing, input);
      const now = new Date().toISOString();

      const updated: Ticket = { ...existing, ...patch, updatedAt: now };
      db.tickets[index] = updated;

      // Nudge timestamps so several events in one request keep their order.
      events.forEach((event, offset) => {
        db.events.push({
          id: randomUUID(),
          ticketId: id,
          type: event.type,
          message: event.message,
          actor: event.actor,
          createdAt: new Date(Date.parse(now) + offset).toISOString(),
        });
      });

      await save(db);
      return { ticket: detail(db, updated), notifyResolved };
    });
  },

  async getStats(): Promise<TicketStats> {
    const db = await load();
    return computeStats(db.tickets);
  },

  async resolveAttachment(id: string): Promise<AttachmentTarget | null> {
    const db = await load();
    const attachment = db.attachments.find((a) => a.id === id);
    if (!attachment) return null;

    try {
      const bytes = await readFile(path.join(UPLOAD_DIR, attachment.storagePath));
      return { fileName: attachment.fileName, mimeType: attachment.mimeType, bytes };
    } catch {
      return null;
    }
  },
};
