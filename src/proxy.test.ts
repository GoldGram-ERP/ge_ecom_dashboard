import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

// What the backend receives: Next passes the request headers the proxy chose as x-middleware-request-*.
function forwarded(headers: Record<string, string>) {
  const response = proxy(new NextRequest("http://localhost/api/admin/orders", { headers }));
  const kept = response.headers.get("x-middleware-override-headers")!.split(",");
  const sent = (name: string) => (kept.includes(name) ? response.headers.get(`x-middleware-request-${name}`) : null);
  return { ip: sent("x-gg-client-ip"), key: sent("x-gg-proxy-key"), cookie: sent("cookie") };
}

const forged = { "x-gg-client-ip": "6.6.6.6", "x-gg-proxy-key": "forged" };

describe("client IP for the backend", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends the first x-forwarded-for entry and the shared key, never the browser's own", () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
    expect(forwarded({ ...forged, "x-forwarded-for": "203.0.113.7, 10.0.0.1", cookie: "gg_admin=a" })).toEqual({ ip: "203.0.113.7", key: "s3cret", cookie: "gg_admin=a" });
  });

  it("falls back to x-real-ip", () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
    expect(forwarded({ ...forged, "x-real-ip": "198.51.100.4" })).toMatchObject({ ip: "198.51.100.4", key: "s3cret" });
  });

  it("adds nothing without the secret, and still drops what the browser sent", () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "");
    expect(forwarded({ ...forged, "x-forwarded-for": "203.0.113.7" })).toMatchObject({ ip: null, key: null });
  });
});
