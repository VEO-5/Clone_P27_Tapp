import type { NextRequest } from "next/server";

import { notifySupportInbox, sendTicketCreatedEmail } from "@/lib/email";
import {
  EMPLOYEE_COOKIE,
  createEmployeeToken,
  employeeCookieOptions,
} from "@/lib/employeeAuth";
import { badRequest, ok, serverError, validationFailed } from "@/lib/http";
import { normaliseReference } from "@/lib/reference";
import { getRepository, type UploadFile } from "@/lib/repo";
import { createTicketSchema, validateFiles } from "@/lib/validation";

/** Attachments are buffered and Supabase's service-role key is used — Node only. */
export const runtime = "nodejs";

/**
 * POST /api/tickets — submit a support ticket.
 *
 * Accepts `multipart/form-data` so screenshots ride along with the form in a
 * single request. Validation runs here as well as in the browser: the client
 * check is UX, this one is the actual guarantee.
 */
export async function POST(request: NextRequest) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      const empty = createTicketSchema.safeParse({
        employeeName: "",
        employeeEmail: "",
        title: "",
        description: "",
      });
      return empty.success ? badRequest("Invalid request body") : validationFailed(empty.error);
    }

    const parsed = createTicketSchema.safeParse({
      employeeName: form.get("employeeName") ?? "",
      employeeEmail: form.get("employeeEmail") ?? "",
      title: form.get("title") ?? "",
      description: form.get("description") ?? "",
      category: form.get("category") ?? "other",
      priority: form.get("priority") ?? "medium",
    });

    if (!parsed.success) return validationFailed(parsed.error);

    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
    const realFiles = files.filter((file) => file.size > 0);

    const fileErrors = validateFiles(
      realFiles.map((file) => ({ name: file.name, size: file.size, type: file.type })),
    );
    if (fileErrors.length > 0) return badRequest(fileErrors[0], { files: fileErrors.join(" · ") });

    const uploads: UploadFile[] = await Promise.all(
      realFiles.map(async (file) => ({
        fileName: file.name,
        mimeType: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const ticket = await getRepository().createTicket(parsed.data, uploads);

    // Notifications are best-effort — a mail outage must not fail the submission.
    const [confirmation] = await Promise.allSettled([
      sendTicketCreatedEmail(ticket),
      notifySupportInbox(ticket),
    ]);

    const response = ok(
      {
        ticket,
        emailSent:
          confirmation.status === "fulfilled" ? confirmation.value.sent : false,
      },
      201,
    );
    response.cookies.set(
      EMPLOYEE_COOKIE,
      createEmployeeToken(ticket.employeeEmail),
      employeeCookieOptions(),
    );
    return response;
  } catch (error) {
    return serverError("tickets.create", error);
  }
}

/**
 * GET /api/tickets?ref=PRL-XXXXXX — one ticket
 * GET /api/tickets?email=name@pearl27.com — every ticket for that employee
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ref = searchParams.get("ref");
  const email = searchParams.get("email");

  try {
    const repo = getRepository();

    if (ref) {
      const ticket = await repo.getTicketByReference(normaliseReference(ref));
      return ok({ tickets: ticket ? [ticket] : [] });
    }

    if (email) {
      return ok({ tickets: await repo.listTicketsByEmail(email) });
    }

    return badRequest("Provide a `ref` or `email` query parameter");
  } catch (error) {
    return serverError("tickets.list", error);
  }
}
