"use client";

import { T } from "@/components/t";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, errorMessage } from "@/lib/api";
import { STATUS_LABELS, statusChoices, statusNeedsConfirm } from "@/lib/labels";
import { usePermissions } from "@/lib/permissions";
import type { OrderStatus } from "@/lib/types";
import { Confirm } from "./modal";
import { Select } from "./select";
import { toast } from "./toast";

const LABEL = Object.fromEntries(STATUS_LABELS) as Record<OrderStatus, string>;

// The refusals of PUT /admin/orders/:id/status, in plain words.
const REFUSALS: Record<string, string> = {
  OUT_OF_STOCK: "Not enough stock to take this order out of Cancelled, so nothing was changed. Restock its items, then try again.",
  INVALID_STATUS: "That status does not fit this order, so nothing was changed. Pick another one.",
};

/**
 * The order's status as a dropdown that can be changed at once (no Edit step). On the order page
 * it stands beside a note for the history and Save. `compact` is the orders table's row: no
 * note, and picking a status saves it. Either way a move that returns stock (into Cancelled) or
 * takes it again (out of it) asks first. The server decides what is allowed.
 * Give it `key={status}` so it starts again from what the server holds after each change.
 */
export function OrderStatusField({
  id,
  status,
  statusOptions,
  compact = false,
}: {
  id: number;
  status: OrderStatus;
  /** From the API; absent while the backend does not offer the dropdown, and then it stays read-only. */
  statusOptions?: string[];
  compact?: boolean;
}) {
  const router = useRouter();
  const { can } = usePermissions();
  const [value, setValue] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = statusOptions !== undefined && can("orders:status");

  async function save(next: OrderStatus) {
    setBusy(true);
    setError(null);
    try {
      const trimmed = note.trim();
      await api(`/admin/orders/${id}/status`, { method: "PUT", body: trimmed ? { status: next, note: trimmed } : { status: next } });
    } catch (failure) {
      setBusy(false);
      setConfirming(false);
      const code = failure instanceof ApiError ? failure.code : "";
      const message = REFUSALS[code] ?? errorMessage(failure);
      if (compact) {
        // A row has no room for the message, and it shows the order's real status again.
        toast(message);
        setValue(status);
      } else {
        setError(message);
      }
      if (code === "UNAUTHENTICATED") router.replace("/login");
      if (code === "NOT_FOUND") router.refresh();
      return;
    }
    setBusy(false);
    setConfirming(false);
    setNote("");
    toast("Status changed");
    // The page reads the order again: its badges, buttons and history follow the new status.
    router.refresh();
  }

  /** Saves, or asks first when stock moves. */
  function submit(next: OrderStatus) {
    if (next === status) return;
    if (statusNeedsConfirm(status, next)) setConfirming(true);
    else void save(next);
  }

  // The table already shows the status as badges; without the permission a row adds nothing.
  if (compact && !editable) return null;

  return (
    <div className={compact ? "inline-flex" : "flex flex-wrap items-center gap-2"}>
      <Select
        aria-label="Order status"
        value={value}
        onChange={(event) => {
          const next = event.target.value as OrderStatus;
          setValue(next);
          setError(null);
          if (compact) submit(next);
        }}
        disabled={!editable || busy}
        // Locked, it still reads as the order's status, not as a greyed-out control.
        className={compact ? "w-44" : "w-52 disabled:cursor-default disabled:opacity-100"}
      >
        {statusChoices(status, editable ? (statusOptions ?? []) : []).map((choice) => (
          <option key={choice} value={choice}>
            {LABEL[choice]}
          </option>
        ))}
      </Select>
      {editable && !compact ? (
        <>
          <Input
            aria-label="Note for the history (optional)"
            placeholder="Note for the history (optional)"
            value={note}
            maxLength={500}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
            className="w-72 bg-card"
          />
          <Button size="sm" variant="gold" disabled={busy || value === status} onClick={() => submit(value)}>
            <T>Save</T>
          </Button>
        </>
      ) : null}
      {error ? (
        <p role="alert" dir="auto" className="basis-full text-sm text-destructive">
          <T>{error}</T>
        </p>
      ) : null}
      {confirming ? (
        <Confirm
          question={
            value === "cancelled"
              ? "Cancel this order? Its items go back to stock."
              : "Take this order out of Cancelled? Its items are taken from stock again."
          }
          confirmLabel={value === "cancelled" ? "Cancel order" : "Reopen order"}
          danger={value === "cancelled"}
          busy={busy}
          onConfirm={() => save(value)}
          onCancel={() => {
            setConfirming(false);
            // In a row nothing else shows the unsaved pick, so it goes back to the order's status.
            if (compact) setValue(status);
          }}
        />
      ) : null}
    </div>
  );
}
