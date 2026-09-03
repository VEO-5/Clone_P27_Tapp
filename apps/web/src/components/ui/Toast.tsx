"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

export function Toaster() {
  return <SonnerToaster position="bottom-center" richColors closeButton />;
}

export { toast };
