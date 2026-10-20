import type { NextConfig } from "next";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Hosts that run the app as one self-contained server (Hostinger) need the standalone output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // The browser only ever calls same-origin /api/...; Next forwards it to the backend,
  // so there is no CORS and the admin cookie stays first-party.
  // The outbox became part of the system logs; its old addresses still open the right screen.
  async redirects() {
    return [
      { source: "/outbox", destination: "/logs", permanent: false },
      { source: "/outbox/:id", destination: "/logs/message/:id", permanent: false },
    ];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
