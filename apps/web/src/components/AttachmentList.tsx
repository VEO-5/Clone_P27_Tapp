import { FileText, ImageIcon, Paperclip } from "lucide-react";

import { formatBytes } from "@/lib/validation";
import type { TicketAttachment } from "@/lib/types";

export function AttachmentList({ attachments }: { attachments: TicketAttachment[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-fog">No files were attached to this ticket.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((file) => {
        const isImage = file.mimeType.startsWith("image/");
        return (
          <li key={file.id}>
            <a
              href={`/api/attachments/${file.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/50 p-2.5 transition-colors hover:border-ink-500 hover:bg-ink-800"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-900 text-mist">
                {isImage ? (
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
                </span>
              </span>
              <Paperclip className="size-3.5 shrink-0 text-fog" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
