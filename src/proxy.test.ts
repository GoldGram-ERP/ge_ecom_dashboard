import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

// What the backend receives: the proxy calls it with fetch; the stub records the request.
async function forwarded(headers: Record<string, string>, init: { method?: string; body?: string } = {}) {
  const fetchMock = vi.fn(async () => new Response(null, { status: 401 }));
  vi.stubGlobal("fetch", fetchMock);
  const response = await proxy(new NextRequest("http://localhost/api/admin/orders?page=2", { headers, ...init, ...(init.body ? { duplex: "half" } : {}) } as never));
  const [url, sent] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
  const h = sent.headers as Headers;
  return { status: response.status, url: String(url), sent, ip: h.get("x-gg-client-ip"), key: h.get("x-gg-proxy-key"), cookie: h.get("cookie"), host: h.get("host"), cf: h.get("cf-ray") };
}

const forged = { "x-gg-client-ip": "6.6.6.6", "x-gg-proxy-key": "forged" };

describe("client IP for the backend", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends Cloudflare's cf-connecting-ip and the shared key, never the browser's own", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
    expect(await forwarded({ ...forged, "cf-connecting-ip": "192.0.2.9", "x-forwarded-for": "203.0.113.7", cookie: "gg_admin=a" })).toMatchObject({ ip: "192.0.2.9", key: "s3cret", cookie: "gg_admin=a" });
  });

  it("falls back to the first x-forwarded-for entry, then x-real-ip", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
    expect(await forwarded({ ...forged, "x-forwarded-for": "203.0.113.7, 10.0.0.1" })).toMatchObject({ ip: "203.0.113.7", key: "s3cret" });
    expect(await forwarded({ ...forged, "x-real-ip": "198.51.100.4" })).toMatchObject({ ip: "198.51.100.4", key: "s3cret" });
  });

  it("adds nothing without the secret, and still drops what the browser sent", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "");
    expect(await forwarded({ ...forged, "x-forwarded-for": "203.0.113.7" })).toMatchObject({ ip: null, key: null });
  });
});

describe("backend call", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("goes to API_URL with path and query, without Host or cf-* headers, and passes the status back", async () => {
    const r = await forwarded({ host: "admin.goldgram.eg", "cf-ray": "abc", cookie: "a=b" });
    expect(r).toMatchObject({ status: 401, url: "http://localhost:4000/api/admin/orders?page=2", host: null, cf: null, cookie: "a=b" });
    expect(r.sent).toMatchObject({ method: "GET", redirect: "manual" });
    expect(r.sent.body).toBeUndefined();
  });

  it("passes the method and body of a write through", async () => {
    const r = await forwarded({ "content-type": "application/json" }, { method: "POST", body: "{}" });
    expect(r.sent.method).toBe("POST");
    expect(r.sent.body).toBeDefined();
  });
});
