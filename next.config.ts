import type { NextConfig } from "next";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

// Staff tool CSP: scripts and API calls only from this site, no plugins, no framing, no
// <base> or form tricks. Next's inline bootstrap needs 'unsafe-inline'; dev also needs eval and
// the hot-reload socket. https: images, styles and fonts keep the email preview identical.
const DEV = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  `connect-src 'self'${DEV ? " ws: wss:" : ""}`,
  "frame-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Hosts that run the app as one self-contained server (Hostinger) need the standalone output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  // Staff tool: never framed, never sniffed, no referrer to other sites, HTTPS only.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: CSP },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
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
