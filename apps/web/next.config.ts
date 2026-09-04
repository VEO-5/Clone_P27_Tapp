import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy routes → replacements (Phase 1)
      { source: "/my-tickets", destination: "/tickets", permanent: false },
      { source: "/my-tickets/:path*", destination: "/tickets/:path*", permanent: false },
      { source: "/track", destination: "/tickets", permanent: false },
      { source: "/track/:reference", destination: "/tickets/:reference", permanent: false },
      { source: "/admin/login", destination: "/sign-in", permanent: false },
      { source: "/admin/tickets/:id", destination: "/desk/tickets/:id", permanent: false },
    ];
  },
};

export default nextConfig;
