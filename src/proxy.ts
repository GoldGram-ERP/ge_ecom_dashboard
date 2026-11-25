import type { NextRequest } from "next/server";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

// Only end-to-end headers go to the backend. On Cloudflare Workers a next.config rewrite re-sends the
// visitor's own Host and cf-* headers, which Cloudflare refuses for another zone (error 1003), so the
// call is made here. The two client-IP headers are always the browser's forgery and are dropped too.
const DROP = /^(host|connection|keep-alive|transfer-encoding|upgrade|te|trailer|proxy-.*|cf-.*|cdn-loop|x-forwarded-.*|x-real-ip|x-gg-client-ip|x-gg-proxy-key)$/i;

// Calls to /api go on to the backend, which would see this server's IP for every visitor. They carry
// the visitor's IP instead, vouched for by a secret only this server knows.
export function proxy(request: NextRequest): Promise<Response> {
  const headers = new Headers();
  request.headers.forEach((value, name) => {
    if (!DROP.test(name)) headers.set(name, value);
  });
  const key = process.env.PROXY_SHARED_SECRET;
  // Cloudflare sets cf-connecting-ip; Vercel sets x-forwarded-for (first entry is the visitor) and x-real-ip.
  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip")?.trim();
  if (key && ip) {
    headers.set("x-gg-client-ip", ip);
    headers.set("x-gg-proxy-key", key);
  }
  const init: RequestInit & { duplex?: "half" } = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  return fetch(new URL(request.nextUrl.pathname + request.nextUrl.search, API_URL), init);
}

export const config = { matcher: ["/api/:path*"] };
