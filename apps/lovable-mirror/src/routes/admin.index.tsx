import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 7/8: /admin -> /desk/admin ("Admin moved inside the desk
// shell — old bookmarks follow"). FE-L-2.6.
export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/desk/admin" });
  },
});
