import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect 2/8: /my-tickets/* -> /tickets (section home).
// Deviation noted: next.config maps to /tickets/:path*, but only index/new/
// $reference exist downstream, so deep suffixes would 404 either way —
// section home keeps old bookmarks useful. FE-L-2.6.
export const Route = createFileRoute("/my-tickets/$splat")({
  beforeLoad: () => {
    throw redirect({ to: "/tickets" });
  },
});
