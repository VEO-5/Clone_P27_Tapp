import { Resend } from "resend";

import { env, isEmailConfigured } from "./env";
import { CATEGORY_LABELS, PRIORITY_LABELS, type Ticket } from "./types";

/**
 * Transactional email.
 *
 * Every send is best-effort: if Resend isn't configured, or the API call fails,
 * we log and return. Notifications must never turn a successful ticket
 * submission into a 500 for the employee.
 */

let resend: Resend | null = null;

function client(): Resend | null {
  const key = env.resendApiKey;
  if (!key) return null;
  resend ??= new Resend(key);
  return resend;
}

interface Message {
  to: string;
  subject: string;
  html: string;
}

async function send(message: Message): Promise<{ sent: boolean; reason?: string }> {
  const api = client();
  if (!api) {
    console.info(`[email:skipped] "${message.subject}" -> ${message.to} (RESEND_API_KEY not set)`);
    return { sent: false, reason: "email-not-configured" };
  }

  try {
    const { error } = await api.emails.send({
      from: env.emailFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    if (error) {
      console.error("[email:failed]", error.message);
      return { sent: false, reason: error.message };
    }
    return { sent: true };
  } catch (error) {
    console.error("[email:failed]", error);
    return { sent: false, reason: "send-threw" };
  }
}

// --- templates -------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(heading: string, body: string, cta?: { label: string; href: string }): string {
  return `
<div style="margin:0;padding:32px 16px;background:#FAF9F6;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(27,42,74,0.12);overflow:hidden;">
    <div style="padding:22px 28px;border-bottom:1px solid rgba(27,42,74,0.12);">
      <span style="color:#1B2A4A;font-size:13px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;">Pearl&nbsp;27</span>
      <span style="color:#4A5568;font-size:13px;letter-spacing:.05em;"> &middot; Sphere Support</span>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 14px;color:#1B2A4A;font-size:24px;line-height:1.35;font-weight:500;font-style:italic;">${heading}</h1>
      <div style="color:#4A5568;font-size:15px;line-height:1.65;">${body}</div>
      ${
        cta
          ? `<div style="margin-top:26px;">
               <a href="${cta.href}" style="display:inline-block;padding:12px 22px;border-radius:2px;background:#E8872B;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">${cta.label}</a>
             </div>`
          : ""
      }
    </div>
    <div style="padding:18px 28px;border-top:1px solid rgba(27,42,74,0.12);color:#6B7280;">
      <p style="margin:0;color:#6B7280;font-size:12px;line-height:1.6;">This is an automated message from Pearl 27 Sphere Support. Reply only if you need to add information to your ticket.</p>
    </div>
  </div>
</div>`;
}

function detailRows(ticket: Ticket): string {
  const rows: [string, string][] = [
    ["Reference", ticket.reference],
    ["Issue", ticket.title],
    ["Category", CATEGORY_LABELS[ticket.category]],
    ["Priority", PRIORITY_LABELS[ticket.priority]],
  ];

  return `<table style="width:100%;margin:20px 0 0;border-collapse:collapse;">${rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:7px 0;color:#6d7390;font-size:13px;width:110px;">${label}</td>
        <td style="padding:7px 0;color:#1B2A4A;font-size:14px;font-weight:500;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("")}</table>`;
}

export async function sendTicketCreatedEmail(ticket: Ticket) {
  const trackUrl = `${env.appUrl}/track/${ticket.reference}`;
  return send({
    to: ticket.employeeEmail,
    subject: `[${ticket.reference}] We've received your support request`,
    html: layout(
      "Your support request is logged",
      `<p style="margin:0;">Hi ${escapeHtml(ticket.employeeName.split(" ")[0] ?? "there")}, the System Support team has your request and will pick it up shortly. Keep this reference — you can check progress at any time.</p>
       ${detailRows(ticket)}`,
      { label: "Track this ticket", href: trackUrl },
    ),
  });
}

export async function sendTicketResolvedEmail(ticket: Ticket, note?: string) {
  const trackUrl = `${env.appUrl}/track/${ticket.reference}`;
  return send({
    to: ticket.employeeEmail,
    subject: `[${ticket.reference}] Your support request has been resolved`,
    html: layout(
      "Your ticket has been resolved",
      `<p style="margin:0;">Hi ${escapeHtml(ticket.employeeName.split(" ")[0] ?? "there")}, System Support has marked <strong style="color:#1B2A4A;">${escapeHtml(ticket.title)}</strong> as resolved.</p>
       ${
         note
           ? `<div style="margin:18px 0 0;padding:14px 16px;border-left:3px solid #E8872B;background:#F0EDE6;color:#1B2A4A;font-size:14px;line-height:1.6;">${escapeHtml(note)}</div>`
           : ""
       }
       ${detailRows(ticket)}
       <p style="margin:20px 0 0;">If the issue comes back, open the ticket and reply so we can reopen it.</p>`,
      { label: "View ticket", href: trackUrl },
    ),
  });
}

/** Optional heads-up to the support inbox when a new ticket lands. */
export async function notifySupportInbox(ticket: Ticket) {
  const inbox = env.supportEmail;
  if (!inbox) return { sent: false, reason: "no-support-inbox" };

  return send({
    to: inbox,
    subject: `New ${PRIORITY_LABELS[ticket.priority].toLowerCase()}-priority ticket: ${ticket.title}`,
    html: layout(
      "New support ticket",
      `<p style="margin:0;">${escapeHtml(ticket.employeeName)} (${escapeHtml(ticket.employeeEmail)}) submitted a new ticket.</p>
       ${detailRows(ticket)}`,
      { label: "Open in dashboard", href: `${env.appUrl}/admin/tickets/${ticket.id}` },
    ),
  });
}

export { isEmailConfigured };
