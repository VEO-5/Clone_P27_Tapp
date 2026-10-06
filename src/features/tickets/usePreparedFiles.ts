"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MAX_PROCESS_BYTES,
  isCompressibleImage,
  maybeCompressImage,
} from "@/lib/image-compress";
import { MAX_FILES, formatBytes, validateFile } from "@/lib/validation";

export interface PreparedItem {
  key: string;
  name: string;
  size: number;
  status: "processing" | "ready" | "error";
  /** Final bytes when ready — this exact File is previewed and uploaded. */
  file: File | null;
  previewUrl: string | null;
  note: string | null;
  error: string | null;
}

export function preparedKey(file: { name: string; size: number; lastModified: number }): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Process-at-select file pipeline (the advanced-uploader contract):
 *
 * - pick → validate → oversize photos compress HERE, immediately
 * - preview always shows the FINAL bytes (never the pre-compression original)
 * - submit uploads those exact bytes once — no re-processing, ever
 *
 * Error items stay visible with their message but never count toward the
 * file limit and are never submitted.
 */
export function usePreparedFiles() {
  const [items, setItems] = useState<PreparedItem[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  // Ref mirror: async compression completions must see the latest list,
  // not the render-closed-over one from when processing started.
  const itemsRef = useRef<PreparedItem[]>([]);
  const setItemsSync = useCallback((next: PreparedItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  // Object URLs die with the pipeline — no leaks across tickets.
  useEffect(() => {
    const snapshot = itemsRef;
    return () => {
      snapshot.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const processJob = useCallback(
    async (key: string, file: File) => {
      try {
        const originalSize = file.size;
        const { file: final } = await maybeCompressImage(file);
        const current = itemsRef.current;
        if (!current.some((item) => item.key === key && item.status === "processing")) return;
        const previewUrl = final.type.startsWith("image/") ? URL.createObjectURL(final) : null;
        setItemsSync(
          current.map((item) =>
            item.key === key
              ? {
                  ...item,
                  status: "ready" as const,
                  file: final,
                  previewUrl,
                  size: final.size,
                  note: `Compressed for upload · ${formatBytes(originalSize)} → ${formatBytes(final.size)}`,
                }
              : item,
          ),
        );
      } catch (error) {
        const current = itemsRef.current;
        if (!current.some((item) => item.key === key && item.status === "processing")) return;
        setItemsSync(
          current.map((item) =>
            item.key === key
              ? {
                  ...item,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Couldn't process this file.",
                }
              : item,
          ),
        );
      }
    },
    [setItemsSync],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming || incoming.length === 0) return;
      const current = itemsRef.current;
      const liveCount = current.filter((item) => item.status !== "error").length;
      const errors: string[] = [];
      const additions: PreparedItem[] = [];
      const jobs: { key: string; file: File }[] = [];

      for (const file of Array.from(incoming)) {
        const key = preparedKey(file);
        if (current.some((item) => item.key === key) || additions.some((item) => item.key === key)) {
          continue;
        }
        if (liveCount + additions.length >= MAX_FILES) {
          errors.push(`You can attach up to ${MAX_FILES} files`);
          break;
        }
        const error = validateFile(file);
        if (!error) {
          additions.push({
            key,
            name: file.name,
            size: file.size,
            status: "ready",
            file,
            previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
            note: null,
            error: null,
          });
          continue;
        }
        // Oversize still photo: accept into the pipeline — it compresses
        // right now, and the preview shows the compressed result.
        if (
          isCompressibleImage(file) &&
          file.size > 0 &&
          file.size <= MAX_PROCESS_BYTES
        ) {
          additions.push({
            key,
            name: file.name,
            size: file.size,
            status: "processing",
            file: null,
            previewUrl: null,
            note: null,
            error: null,
          });
          jobs.push({ key, file });
        } else {
          errors.push(error);
        }
      }

      setRejected(errors);
      if (additions.length > 0) setItemsSync([...current, ...additions]);
      for (const job of jobs) void processJob(job.key, job.file);
    },
    [processJob, setItemsSync],
  );

  const removeFile = useCallback(
    (key: string) => {
      const current = itemsRef.current;
      const target = current.find((item) => item.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      setRejected([]);
      setItemsSync(current.filter((item) => item.key !== key));
    },
    [setItemsSync],
  );

  const reset = useCallback(() => {
    itemsRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    setRejected([]);
    setItemsSync([]);
  }, [setItemsSync]);

  const readyFiles = items.filter((item) => item.status === "ready" && item.file).map((item) => item.file as File);
  const hasProcessing = items.some((item) => item.status === "processing");

  return { items, rejected, files: readyFiles, hasProcessing, addFiles, removeFile, reset };
}

export type PreparedFiles = ReturnType<typeof usePreparedFiles>;
