import { NextResponse, type NextRequest } from "next/server";

import { notFound, serverError } from "@/lib/http";
import { getRepository } from "@/lib/repo";

export const runtime = "nodejs";

/**
 * GET /api/attachments/[id] — serves a screenshot.
 *
 * One stable URL for both backends: on Supabase it redirects to a short-lived
 * signed URL (the bucket stays private, so paths can't be guessed), and on the
 * local fallback store it streams the file from disk.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const target = await getRepository().resolveAttachment(id);
    if (!target) return notFound("Attachment not found");

    if (target.signedUrl) {
      return NextResponse.redirect(target.signedUrl);
    }

    if (target.bytes) {
      return new NextResponse(new Uint8Array(target.bytes), {
        headers: {
          "Content-Type": target.mimeType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(target.fileName)}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    return notFound("Attachment not available");
  } catch (error) {
    return serverError("attachments.get", error);
  }
}
