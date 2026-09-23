"use client";

import { FileText, ImageIcon, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

import type { PreparedItem } from "@/features/tickets/usePreparedFiles";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES,
  MAX_FILE_BYTES,
  formatBytes,
} from "@/lib/validation";
import { cn } from "@/lib/utils";

export interface UploadZoneProps {
  items: PreparedItem[];
  rejected: string[];
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
}

/**
 * Screenshot/file picker with drag-and-drop. Processing happens the moment
 * files are picked (see usePreparedFiles): rows show the FINAL bytes being
 * previewed and uploaded — "Processing…", then the compressed preview.
 * Rejected files are reported inline without clearing accepted work.
 */
export function UploadZone({ items, rejected, onAdd, onRemove, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const liveCount = items.filter((item) => item.status !== "error").length;
  const full = liveCount >= MAX_FILES;

  const openPicker = (event: React.SyntheticEvent) => {
    // Clicks that land directly on the native input already open the dialog —
    // re-firing input.click() from the zone handler stacks a second dialog
    // behind the first. Only the zone itself should trigger the picker.
    if (event.target === inputRef.current) return;
    if (!disabled && !full) inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={disabled || full ? -1 : 0}
        aria-disabled={disabled || full}
        aria-label="Attach screenshots or files"
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker(event);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled && !full) onAdd(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-all duration-200",
          dragging
            ? "border-iris-400 bg-iris-500/10 scale-[1.01]"
            : "border-ink-600 bg-ink-900/50 hover:border-ink-500 hover:bg-ink-800/50",
          (disabled || full) && "cursor-not-allowed opacity-60 hover:border-ink-600",
        )}
      >
        <span
          className={cn(
            "grid size-11 place-items-center rounded-xl border border-ink-600 bg-ink-800/80 text-mist transition-colors",
            dragging && "border-iris-400/50 bg-iris-500/15 text-iris-700",
          )}
        >
          <UploadCloud className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-pearl-dim">
          {full ? (
            `Maximum of ${MAX_FILES} files attached`
          ) : (
            <>
              <span className="text-iris-700 underline decoration-iris-400/60 underline-offset-4">
                Choose files
              </span>{" "}
              or drag screenshots here
            </>
          )}
        </p>
        <p className="text-[11.5px] text-fog">
          PNG, JPEG, WebP, GIF, PDF or TXT · up to {formatBytes(MAX_FILE_BYTES)} each · larger
          photos are processed on the spot
        </p>

        <input
          ref={inputRef}
          type="file"
          id="files"
          name="files"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={disabled || full}
          onChange={(event) => {
            onAdd(Array.from(event.target.files ?? []));
            // Reset so re-picking the same file still fires a change event.
            event.target.value = "";
          }}
        />
      </div>

      {rejected.length > 0 && (
        <ul aria-live="polite" className="flex flex-col gap-1">
          {rejected.map((message) => (
            <li key={message} className="text-[12.5px] text-rose-400">
              {message}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="animate-rise flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/60 p-2.5"
            >
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-600 bg-ink-900">
                {item.status === "processing" ? (
                  <Loader2 className="size-4 animate-spin text-mist" aria-hidden />
                ) : item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview of the final upload bytes
                  <img src={item.previewUrl} alt="" className="size-full object-cover" />
                ) : item.name.toLowerCase().endsWith(".pdf") ? (
                  <FileText className="size-4 text-mist" aria-hidden />
                ) : (
                  <ImageIcon className="size-4 text-mist" aria-hidden />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-pearl-dim">
                  {item.name}
                </span>
                {item.status === "processing" ? (
                  <span className="mono-ref text-[11px] text-fog" aria-live="polite">
                    Processing…
                  </span>
                ) : item.status === "error" ? (
                  <span className="mt-0.5 block text-[12px] text-rose-400" role="alert">
                    {item.error ?? "Couldn't process this file."}
                  </span>
                ) : (
                  <span className="mono-ref text-[11px] text-fog">
                    {formatBytes(item.size)}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => onRemove(item.key)}
                disabled={disabled}
                aria-label={`Remove ${item.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-fog transition-colors hover:bg-ink-700 hover:text-rose-400"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {liveCount > 0 && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-fog">
          <Paperclip className="size-3" aria-hidden />
          {liveCount} of {MAX_FILES} files attached
        </p>
      )}
    </div>
  );
}
