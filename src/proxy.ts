import { type NextRequest, NextResponse } from "next/server";

// Calls to /api go on to the backend (next.config.ts rewrite), which would see this server's IP for
// every visitor. They carry the visitor's IP instead, vouched for by a secret only this server knows;
// whatever the browser sent in those two headers is dropped first.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("x-gg-client-ip");
  headers.delete("x-gg-proxy-key");
  const key = process.env.PROXY_SHARED_SECRET;
  // Vercel's edge sets x-forwarded-for (and x-real-ip) itself; the first entry is the visitor.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip")?.trim();
  if (key && ip) {
    headers.set("x-gg-client-ip", ip);
    headers.set("x-gg-proxy-key", key);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/api/:path*"] };
