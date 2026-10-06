// Lovable Modern server entry — TanStack Start.
// Per-route rendering flags live in src/routes/*.tsx (`ssr: true | false | "data-only"`).
// Secrets (SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SESSION_SECRET) are
// server-only here via Workers bindings — never import.meta.env.VITE_*.
export default {
  fetch() {
    return new Response("pearl27-ticketing start server", { status: 200 });
  },
};
