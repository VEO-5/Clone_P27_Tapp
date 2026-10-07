import { createClient } from "@supabase/supabase-js";

/**
 * Lovable Modern browser client (anon/publishable key only).
 * Direct reads/writes allowed by RLS. Secrets stay server-only in
 * createServerFn / Workers bindings — never VITE_-prefixed.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — check .env.local",
  );
}

// Placeholder-tolerant: supabase-js throws on empty key, which would crash
// unit tests and static builds with no env. Auth calls fail honestly at
// runtime until real keys are provided (the dev warning above says so).
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  key ?? "placeholder-anon-key",
  {
    auth: { persistSession: true, autoRefreshToken: true },
  },
);
