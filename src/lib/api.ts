// Shared API helpers. Safe to import from Client Components: the server-only helper that
// forwards the admin cookie lives in ./api-server.ts.
import type { FieldError } from "./types";

/** `code` values that do not come from the backend but from the transport. */
export const NETWORK = "NETWORK";
export const UPSTREAM = "UPSTREAM";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reads a backend response: the JSON body on success, an `ApiError` otherwise. */
export async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown;
  try {
    body = text === "" ? undefined : JSON.parse(text);
  } catch {
    body = undefined;
  }

  if (response.ok) {
    if (body === undefined) {
      throw new ApiError(response.status, UPSTREAM, "The server sent an unreadable reply.");
    }
    return body as T;
  }

  if (isRecord(body) && typeof body.code === "string") {
    const message = typeof body.message === "string" ? body.message : "The request was refused.";
    throw new ApiError(response.status, body.code, message, body.details);
  }
  // No error body in the spec's shape: the proxy could not reach the backend, or it crashed.
  throw new ApiError(response.status, UPSTREAM, "The server did not answer properly.");
}

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/** Browser-side call to the same-origin proxy: `api("/admin/prices", { method: "PUT", body })`. */
export async function api<T>(path: string, request: ApiRequest = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: request.method ?? "GET",
      credentials: "same-origin",
      headers:
        request.body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    });
  } catch {
    throw new ApiError(0, NETWORK, "Could not reach the server.");
  }
  return readResponse<T>(response);
}

/** The `details` of a `VALIDATION_FAILED` error as a list; empty for anything else. */
export function fieldErrorsOf(error: unknown): FieldError[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return [];
  const out: FieldError[] = [];
  for (const entry of error.details) {
    if (!isRecord(entry) || typeof entry.field !== "string") continue;
    out.push({ field: entry.field, code: entry.code === "required" ? "required" : "invalid" });
  }
  return out;
}

export const COULD_NOT_REACH = "Could not reach the server. Try again.";

const MESSAGES: Record<string, string> = {
  [NETWORK]: COULD_NOT_REACH,
  [UPSTREAM]: COULD_NOT_REACH,
  INTERNAL_ERROR: "The server hit a problem. Try again.",
  INVALID_CREDENTIALS: "That email and password do not match a staff account.",
  RATE_LIMITED: "Too many sign-in attempts. Wait a minute, then try again.",
  UNAUTHENTICATED: "Your session has ended. Sign in again.",
  FORBIDDEN: "Your role does not allow this.",
  INVALID_TRANSITION: "This order was already moved by someone else. The list has been refreshed.",
  NEEDS_REVIEW: "The price moved past the tolerance. Review this order instead.",
  PRICE_JUMP: "This moves the price by more than 5%.",
  IN_USE: "Still used elsewhere. Deactivate it instead.",
  NOT_FOUND: "That record no longer exists.",
};

/**
 * One plain sentence for a failed request. `labels` maps backend field names
 * (`laborPiastres`, `cashback.valid`) to the names staff see on the screen.
 */
export function errorMessage(error: unknown, labels: Record<string, string> = {}): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";

  if (error.code === "VALIDATION_FAILED") {
    const names = [...new Set(fieldErrorsOf(error).map((f) => labels[f.field] ?? f.field))];
    if (names.length === 0) return "The server refused these values. Check them and try again.";
    return `The server refused ${names.length === 1 ? "this field" : "these fields"}: ${names.join(", ")}.`;
  }
  if (error.status === 429) return MESSAGES.RATE_LIMITED;
  if (Object.hasOwn(MESSAGES, error.code)) return MESSAGES[error.code];
  if (error.status >= 500) return MESSAGES.INTERNAL_ERROR;
  return error.message || "The request was refused.";
}
