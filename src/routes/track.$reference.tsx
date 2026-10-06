import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 4/8: /track/:reference -> /tickets/:reference. FE-L-2.6.
export const Route = createFileRoute("/track/$reference")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/tickets/$reference", params: { reference: params.reference } });
  },
});
