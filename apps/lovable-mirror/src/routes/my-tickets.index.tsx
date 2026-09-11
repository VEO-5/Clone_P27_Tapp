import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 1/8 (next.config.ts): /my-tickets -> /tickets. FE-L-2.6.
export const Route = createFileRoute("/my-tickets/")({
  beforeLoad: () => {
    throw redirect({ to: "/tickets" });
  },
});
