import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 6/8: /admin/tickets/:id -> /desk/tickets/:id. FE-L-2.6.
export const Route = createFileRoute("/admin/tickets/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/desk/tickets/$id", params: { id: params.id } });
  },
});
