"use client";

import { MAX_FILE_BYTES, formatBytes } from "@/lib/validation";

/** Still rasters safe to re-encode. GIF (animation), PDF, TXT pass through untouched. */
export const COMPRESSIBLE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Long edge after downscale — fully legible for support triage, ~10x smaller. */
export const COMPRESS_LONG_EDGE = 1920;
export const COMPRESS_QUALITY = 0.82;
/** Refuse before decoding so a giant file can't hang the tab. */
export const MAX_PROCESS_BYTES = 30 * 1024 * 1024;

/** Files this session downscaled — lets the confirmation screen credit them. */
const compressedFiles = new WeakSet<File>();

export function wasCompressed(file: File): boolean {
  return compressedFiles.has(file);
}

/** Test hook + explicit opt-in marker (maybeCompressImage marks automatically). */
export function markCompressed(file: File): void {
  compressedFiles.add(file);
}

export function isCompressibleImage(file: { type: string }): boolean {
  return (COMPRESSIBLE_MIME_TYPES as readonly string[]).includes(file.type);
}

/** Pure target-size math (unit-tested): shrink long edge to the cap, never enlarge. */
export function compressTarget(
  width: number,
  height: number,
  longEdge = COMPRESS_LONG_EDGE,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const longest = Math.max(width, height);
  if (longest <= longEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = longEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process the image."))),
      "image/jpeg",
      COMPRESS_QUALITY,
    );
  });
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  // createImageBitmap honors EXIF orientation so phone photos come out upright.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // Fall through to the <img> path below.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Downscale an oversize photo to a triage-friendly JPEG. Returns the input
 * untouched when no work is needed. Throws a user-facing Error when the file
 * can't be made to fit (too large to process, undecodable, still oversize).
 */
export async function maybeCompressImage(file: File): Promise<{ file: File; compressed: boolean }> {
  if (!isCompressibleImage(file) || file.size <= MAX_FILE_BYTES) {
    return { file, compressed: false };
  }
  if (file.size > MAX_PROCESS_BYTES) {
    throw new Error(`${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_FILE_BYTES)}`);
  }
  const { source, width, height } = await decodeImage(file);
  const target = compressTarget(width, height);
  if (target.width === 0) throw new Error(`Couldn't read ${file.name}.`);
  if (target.width === Math.round(width) && target.height === Math.round(height)) {
    // Small dimensions but heavy bytes (e.g. dense PNG): re-encode in place.
  }
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`Couldn't process ${file.name}.`);
  // JPEG has no alpha — flatten transparency onto white, not black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0, target.width, target.height);
  if ("close" in source && typeof (source as ImageBitmap).close === "function") {
    (source as ImageBitmap).close();
  }
  const blob = await toJpegBlob(canvas);
  if (blob.size >= file.size) return { file, compressed: false };
  if (blob.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is too large even compressed — the limit is ${formatBytes(MAX_FILE_BYTES)}`);
  }
  const name = file.name.replace(/\.[a-z0-9]+$/i, "") || "photo";
  const compressed = new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  compressedFiles.add(compressed);
  return { file: compressed, compressed: true };
}
