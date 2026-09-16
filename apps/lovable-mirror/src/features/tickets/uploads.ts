import { createTicketSchema } from "@pearl27/contracts";

import { ApiError } from "@/lib/api";

export interface PresignedUpload {
  attachmentId: string;
  uploadUrl: string;
  headers?: Record<string, string>;
}

/** PUT a file to a presigned URL with real progress events (fetch can't do this). */
export function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void,
  headers: Record<string, string> = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    // Presigned storage URLs must stay anonymous — sending cookies breaks
    // CORS preflight on S3/GCS and fails every upload.
    xhr.withCredentials = false;
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    // Ensure the stored object keeps its content type when the presigner
    // didn't supply one explicitly.
    if (file.type && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
      xhr.setRequestHeader("Content-Type", file.type);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
    xhr.send(file);
  });
}

export function fieldErrorsFromApi(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.fieldErrors) return error.fieldErrors;
  return {};
}

export { createTicketSchema };
