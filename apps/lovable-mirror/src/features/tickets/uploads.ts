import { createTicketSchema } from "@pearl27/contracts";

import { ApiError } from "@/lib/api";

export interface PresignedUpload {
  attachmentId: string;
  uploadUrl: string;
  headers?: Record<string, string>;
  /** "put" = raw file body (mock + simple presigns); "post" = form fields + file. */
  method?: "put" | "post";
  /** POST-form fields the storage presign requires (S3-style policy fields). */
  fields?: Record<string, string> | null;
}

/**
 * PUT/POST a file with real progress events (fetch can't do this).
 * POST-form targets receive every presigned field plus the file last —
 * field order matters to some storage backends.
 */
export function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void,
  headers: Record<string, string> = {},
  opts: { method?: "put" | "post"; fields?: Record<string, string> | null } = {},
): Promise<void> {
  const usePostForm = opts.method === "post" || Boolean(opts.fields);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(usePostForm ? "POST" : "PUT", uploadUrl);
    // Presigned storage URLs must stay anonymous — sending cookies breaks
    // CORS preflight on S3/GCS and fails every upload.
    xhr.withCredentials = false;
    let body: XMLHttpRequestBodyInit;
    if (usePostForm) {
      // Presigned POST: every policy field first, file last.
      const form = new FormData();
      for (const [key, value] of Object.entries(opts.fields ?? {})) {
        form.append(key, value);
      }
      form.append("file", file);
      body = form;
    } else {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
      // Ensure the stored object keeps its content type when the presigner
      // didn't supply one explicitly.
      if (file.type && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
        xhr.setRequestHeader("Content-Type", file.type);
      }
      body = file;
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
    xhr.send(body);
  });
}

export function fieldErrorsFromApi(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.fieldErrors) return error.fieldErrors;
  return {};
}

export { createTicketSchema };
