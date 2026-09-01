/**
 * Server-only environment access.
 *
 * Every integration is optional so the app always boots: without Supabase it
 * falls back to a local file-backed store, and without Resend it logs emails
 * instead of sending them. `capabilities()` is what the UI uses to tell the
 * operator which mode they are running in.
 */

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const env = {
  get supabaseUrl() {
    return read("SUPABASE_URL") ?? read("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return read("SUPABASE_SERVICE_ROLE_KEY");
  },
  get supabaseBucket() {
    return read("SUPABASE_STORAGE_BUCKET") ?? "ticket-attachments";
  },
  get resendApiKey() {
    return read("RESEND_API_KEY");
  },
  get emailFrom() {
    return read("EMAIL_FROM") ?? "Pearl 27 Support <onboarding@resend.dev>";
  },
  get supportEmail() {
    return read("SUPPORT_INBOX_EMAIL");
  },
  get adminAccessCode() {
    return read("ADMIN_ACCESS_CODE") ?? "pearl27";
  },
  get sessionSecret() {
    // Falls back to the access code so local dev works without extra setup.
    return read("SESSION_SECRET") ?? `dev-secret:${read("ADMIN_ACCESS_CODE") ?? "pearl27"}`;
  },
  get appUrl() {
    return (
      read("NEXT_PUBLIC_APP_URL") ??
      (read("VERCEL_PROJECT_PRODUCTION_URL") && `https://${read("VERCEL_PROJECT_PRODUCTION_URL")}`) ??
      (read("VERCEL_URL") && `https://${read("VERCEL_URL")}`) ??
      "http://localhost:3000"
    );
  },
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function isEmailConfigured(): boolean {
  return Boolean(env.resendApiKey);
}

export function capabilities() {
  return {
    storage: isSupabaseConfigured() ? ("supabase" as const) : ("local" as const),
    email: isEmailConfigured() ? ("resend" as const) : ("log" as const),
  };
}
