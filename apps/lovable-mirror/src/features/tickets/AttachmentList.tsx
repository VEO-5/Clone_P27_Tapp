"use client";

import type { Attachment } from "@pearl27/contracts";
import { FileText, ImageIcon, Loader2, Paperclip } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

/** Attachments open via short-lived URLs — never a stored URL (FE-2.13). */
export function AttachmentList({ attachments }: { attachments?: Attachment[] | null }) {
  const list = attachments ?? [];
  const [opening, setOpening] = useState<string | null>(null);

  async function open(attachment: Attachment) {
    if (opening) return;
    setOpening(attachment.id);
    try {
      const { url } = await apiFetch<{ url: string; expiresAt: string }>(
        `/attachments/${attachment.id}/url`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open the file.");
    } finally {
      setOpening(null);
    }
  }

  if (list.length === 0) {
    return <p className="text-sm text-fog">No files were attached to this ticket.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {list.map((file) => {
        const isImage = file.mimeType.startsWith("image/");
        const busy = opening === file.id;
        return (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => void open(file)}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/50 p-2.5 text-left transition-colors hover:border-ink-500 hover:bg-ink-800 disabled:opacity-60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-900 text-mist">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : isImage ? (
                  <ImageIcon className="size-4" aria-hidden />
                ) : (
                  <FileText className="size-4" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-pearl-dim">
                  {file.fileName}
                </span>
                <span className="mono-ref text-[11px] text-fog">
                  {formatBytes(file.sizeBytes)}
                  {file.status === "scanning" ? " · scanning" : ""}
                </span>
              </span>
              <Paperclip className="size-3.5 shrink-0 text-fog" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
