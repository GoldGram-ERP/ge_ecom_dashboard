// Server Components only: calls the backend directly and forwards the admin cookie.
import { toArabic } from "@/i18n/translate";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, NETWORK, readResponse } from "./api";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const ADMIN_COOKIE = "gg_admin";
/** The `EN / ع` choice, written by the top bar (components/shell.tsx). */
const LANG_COOKIE = "gg_lang";
/** A backend that has not answered by now is treated as down (EC-15). */
const TIMEOUT_MS = 8000;

async function request(path: string): Promise<Response> {
  const admin = (await cookies()).get(ADMIN_COOKIE);
  try {
    return await fetch(`${API_URL}/api${path}`, {
      headers: {
        Accept: "application/json",
        ...(admin ? { Cookie: `${ADMIN_COOKIE}=${encodeURIComponent(admin.value)}` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, NETWORK, "Could not reach the server.");
  }
}

/** GET for a protected page. A `401` sends the visitor to the login page (AC-20). */
export async function serverGet<T>(path: string): Promise<T> {
  const response = await request(path);
  if (response.status === 401) redirect("/login");
  return readResponse<T>(response);
}

/** Like `serverGet`, but a `404` is an answer (null), not an error. */
export async function serverGetOrNull<T>(path: string): Promise<T | null> {
  const response = await request(path);
  if (response.status === 401) redirect("/login");
  if (response.status === 404) return null;
  return readResponse<T>(response);
}

/**
 * GET for the lists the spec gives no envelope for (catalog, rules, methods, geography).
 * A bare array is expected; `{ items: [...] }` is read too.
 */
export async function serverList<T>(path: string): Promise<T[]> {
  const body = await serverGet<T[] | { items: T[] }>(path);
  return Array.isArray(body) ? body : body.items;
}

/** Whether the request carries a valid admin session. Never redirects. */
export async function hasAdminSession(): Promise<boolean> {
  try {
    return (await request("/admin/auth/me")).ok;
  } catch {
    return false;
  }
}

/** Whether the `EN / ع` switch is on Arabic for this visitor. */
export async function isArabic(): Promise<boolean> {
  return (await cookies()).get(LANG_COOKIE)?.value === "ar";
}

/** `const t = await getT()` in a Server Component, for an attribute or a sentence built in code. Text in JSX uses `<T>`. */
export async function getT(): Promise<(text: string) => string> {
  return (await isArabic()) ? toArabic : (text) => text;
}
