"use client";

import { T } from "@/components/t";
import { Pencil } from "lucide-react";
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
 * The order's status as a dropdown, locked until Edit. Save asks first when the move returns
 * stock (into Cancelled) or takes it again (out of it). The server decides what is allowed.
 */
export function OrderStatusField({
  id,
  status,
  statusOptions,
}: {
  id: number;
  status: OrderStatus;
  /** From the API; absent while the backend does not offer the dropdown, and then it stays read-only. */
  statusOptions?: string[];
}) {
  const router = useRouter();
  const { can } = usePermissions();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = statusOptions !== undefined && can("orders:status");
  const shown = editing ? value : status;

  function start() {
    setValue(status);
    setNote("");
    setError(null);
    setEditing(true);
  }

  function stop() {
    setEditing(false);
    setConfirming(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const trimmed = note.trim();
      await api(`/admin/orders/${id}/status`, { method: "PUT", body: trimmed ? { status: value, note: trimmed } : { status: value } });
    } catch (failure) {
      setBusy(false);
      setConfirming(false);
      const code = failure instanceof ApiError ? failure.code : "";
      setError(REFUSALS[code] ?? errorMessage(failure));
      if (code === "UNAUTHENTICATED") router.replace("/login");
      if (code === "NOT_FOUND") router.refresh();
      return;
    }
    setBusy(false);
    stop();
    toast("Status changed");
    // The page reads the order again: its badges, buttons and history follow the new status.
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Order status"
        value={shown}
        onChange={(event) => setValue(event.target.value as OrderStatus)}
        disabled={!editing || busy}
        // Locked, it still reads as the order's status, not as a greyed-out control.
        className="w-52 disabled:cursor-default disabled:opacity-100"
      >
        {statusChoices(status, editing ? (statusOptions ?? []) : []).map((choice) => (
          <option key={choice} value={choice}>
            {LABEL[choice]}
          </option>
        ))}
      </Select>
      {editing ? (
        <>
          <Input
            aria-label="Note for the history (optional)"
            placeholder="Note for the history (optional)"
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            className="w-72 bg-card"
          />
          <Button
            size="sm"
            variant="gold"
            disabled={busy || value === status}
            onClick={() => (statusNeedsConfirm(status, value) ? setConfirming(true) : save())}
          >
            <T>Save</T>
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={stop}>
            <T>Cancel</T>
          </Button>
        </>
      ) : editable ? (
        <Button size="sm" variant="outline" onClick={start}>
          <Pencil aria-hidden="true" />
          <T>Edit</T>
        </Button>
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
          onConfirm={save}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  );
}
