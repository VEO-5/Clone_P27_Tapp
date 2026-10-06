import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 3/8: /track -> /tickets. FE-L-2.6.
export const Route = createFileRoute("/track/")({
  beforeLoad: () => {
    throw redirect({ to: "/tickets" });
  },
});
