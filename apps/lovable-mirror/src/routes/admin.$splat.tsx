import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 8/8: /admin/* -> /desk/admin (section home).
// Same deviation as my-tickets splat: suffix would 404 downstream.
// Static routes (/admin/login, /admin/tickets/$id) take precedence. FE-L-2.6.
export const Route = createFileRoute("/admin/$splat")({
  beforeLoad: () => {
    throw redirect({ to: "/desk/admin" });
  },
});
