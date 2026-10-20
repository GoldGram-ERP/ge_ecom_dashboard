"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/toast";
import { api, ApiError, type ApiRequest, errorMessage } from "./api";

export interface SendOptions {
  /** The file's toast for this action, shown when the server accepts it. */
  done?: string;
  /** Sentences for specific refusals on this screen, by backend `code`. */
  refusals?: Record<string, string>;
  /** Names of the fields staff see, for a `VALIDATION_FAILED` reply. */
  labels?: Record<string, string>;
}

/**
 * What every action on every screen does: send the change, say what happened in the toast,
 * and load the screen's data again so it shows what the server now holds.
 * `send` resolves to true when the server accepted the change.
 */
export function useSend() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function send(
    method: NonNullable<ApiRequest["method"]>,
    path: string,
    body?: unknown,
    options: SendOptions = {},
  ): Promise<boolean> {
    setBusy(true);
    try {
      await api(path, { method, body });
    } catch (error) {
      setBusy(false);
      const code = error instanceof ApiError ? error.code : "";
      toast(options.refusals?.[code] ?? errorMessage(error, options.labels));
      if (code === "UNAUTHENTICATED") router.replace("/login");
      // Someone else got there first: show what the server holds now.
      if (code === "INVALID_TRANSITION" || code === "NOT_FOUND") router.refresh();
      return false;
    }
    setBusy(false);
    if (options.done) toast(options.done);
    router.refresh();
    return true;
  }

  return { busy, send };
}
