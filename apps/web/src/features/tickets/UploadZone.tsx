"use client";

import { FileText, ImageIcon, Paperclip, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES,
  MAX_FILE_BYTES,
  formatBytes,
  validateFile,
} from "@/lib/validation";
import { cn } from "@/lib/utils";

export interface UploadZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/**
 * Screenshot/file picker with drag-and-drop, image previews, and per-file
 * validation. Rejected files are reported inline and the accepted ones are
 * kept, so one bad drop doesn't clear the employee's work.
 */
export function UploadZone({ files, onChange, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  // Object URLs must be revoked or the page leaks memory as files are swapped.
  const previews = useMemo(
    () =>
      files.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => preview.url && URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;

      const errors: string[] = [];
      const accepted: File[] = [];

      for (const file of Array.from(incoming)) {
        const duplicate = files.some(
          (existing) => existing.name === file.name && existing.size === file.size,
        );
        if (duplicate) continue;

        const error = validateFile(file);
        if (error) {
          errors.push(error);
          continue;
        }

        if (files.length + accepted.length >= MAX_FILES) {
          errors.push(`You can attach up to ${MAX_FILES} files`);
          break;
        }
        accepted.push(file);
      }

      setRejected(errors);
      if (accepted.length > 0) onChange([...files, ...accepted]);
    },
    [files, onChange],
  );

  const remove = (key: string) => {
    setRejected([]);
    onChange(
      files.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== key),
    );
  };

  const full = files.length >= MAX_FILES;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={disabled || full ? -1 : 0}
        aria-disabled={disabled || full}
        aria-label="Attach screenshots or files"
        onClick={() => !disabled && !full && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled && !full) inputRef.current?.click();
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
          if (!disabled && !full) addFiles(event.dataTransfer.files);
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
          PNG, JPEG, WebP, GIF, PDF or TXT · up to {formatBytes(MAX_FILE_BYTES)} each
        </p>

        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={disabled || full}
          onChange={(event) => {
            addFiles(event.target.files);
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

      {previews.length > 0 && (
        <ul className="flex flex-col gap-2">
          {previews.map(({ key, file, url }) => (
            <li
              key={key}
              className="animate-rise flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/60 p-2.5"
            >
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-600 bg-ink-900">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote asset
                  <img src={url} alt="" className="size-full object-cover" />
                ) : file.type === "application/pdf" ? (
                  <FileText className="size-4 text-mist" aria-hidden />
                ) : (
                  <ImageIcon className="size-4 text-mist" aria-hidden />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-pearl-dim">
                  {file.name}
                </span>
                <span className="mono-ref text-[11px] text-fog">{formatBytes(file.size)}</span>
              </span>

              <button
                type="button"
                onClick={() => remove(key)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-fog transition-colors hover:bg-ink-700 hover:text-rose-400"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-fog">
          <Paperclip className="size-3" aria-hidden />
          {files.length} of {MAX_FILES} files attached
        </p>
      )}
    </div>
  );
}
