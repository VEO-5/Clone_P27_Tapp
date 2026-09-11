import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 5/8: /admin/login -> /sign-in. FE-L-2.6.
export const Route = createFileRoute("/admin/login")({
  beforeLoad: () => {
    throw redirect({ to: "/sign-in", search: { next: "/" } });
  },
});
