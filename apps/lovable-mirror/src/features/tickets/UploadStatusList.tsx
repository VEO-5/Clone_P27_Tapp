"use client";

import { CheckCircle2, Paperclip, RotateCcw } from "lucide-react";

import { formatDateTime } from "@/lib/utils";

export interface UploadState {
  fileName: string;
  status: "uploading" | "done" | "error";
  progress: number;
  message?: string;
}

/**
 * Per-file upload states with retry. Shared by the inline confirmation
 * (page flow) and the centered success dialog (slide-over flow) so the
 * two never drift apart. Failures never lose the ticket (FE-2.7).
 */
export function UploadStatusList({
  uploads,
  submittedAt,
  onRetry,
}: {
  uploads: UploadState[];
  submittedAt: string;
  onRetry: (index: number) => void;
}) {
  const done = uploads.filter((u) => u.status === "done").length;
  const failed = uploads.filter((u) => u.status === "error");
  const scanning = uploads.filter((u) => u.status !== "error").length - done;

  if (uploads.length === 0) return null;

  return (
    <div className="w-full rounded-[4px] border border-ink-700 p-4 text-left" aria-live="polite">
      <p className="flex items-center gap-2 text-[13px] font-medium text-pearl-dim">
        <Paperclip className="size-3.5" aria-hidden />
        {failed.length === 0
          ? `${done} of ${uploads.length} files attached${scanning > 0 ? " · scanning" : ""}`
          : `${done} of ${uploads.length} files attached · ${failed.length} failed`}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {uploads.map((upload, index) => (
          <li key={`${upload.fileName}-${index}`} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-pearl-dim">{upload.fileName}</span>
              {upload.status === "uploading" && (
                <span
                  className="mt-1 block h-1 overflow-hidden rounded-full bg-ink-700"
                  role="progressbar"
                  aria-valuenow={upload.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${upload.fileName} upload progress`}
                >
                  <span className="block h-full bg-iris-500 transition-all" style={{ width: `${upload.progress}%` }} />
                </span>
              )}
              {upload.status === "error" && (
                <span className="mt-0.5 block text-[12.5px] text-rose-400">
                  {upload.message ?? "Upload failed — your ticket is saved."}
                </span>
              )}
            </span>
            {upload.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-jade-400" aria-label="Uploaded" />}
            {upload.status === "error" && (
              <button
                type="button"
                onClick={() => onRetry(index)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[2px] border border-ink-600 px-3 text-[13px] font-medium text-pearl hover:border-iris-400"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Retry
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-fog">Submitted {formatDateTime(submittedAt)}</p>
    </div>
  );
}
