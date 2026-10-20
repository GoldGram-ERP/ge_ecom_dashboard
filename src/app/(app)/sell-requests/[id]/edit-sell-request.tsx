"use client";

import { T } from "@/components/t";
import { Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Modal } from "@/components/modal";
import { FormGrid, SelectField, TextAreaField } from "@/components/parts";
import type { SellRequest } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { SELL_STATUS } from "../labels";

/** The only way to change a sell request: its status and the staff notes, in a dialog. */
export function EditSellRequest({ request }: { request: SellRequest }) {
  const { busy, send } = useSend();
  const [open, setOpen] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await send(
      "PATCH",
      `/admin/sell-requests/${request.id}`,
      { status: String(form.get("status")), notes: String(form.get("notes") ?? "") },
      { done: "Request saved" },
    );
    if (saved) setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="gold" size="sm" onClick={() => setOpen(true)}>
        <Pencil aria-hidden="true" />
        <T>Edit</T>
      </Button>
      {open ? (
        <Modal title={`Edit ${request.reference}`} onClose={() => setOpen(false)}>
          <form className="grid gap-4" onSubmit={save} noValidate>
            <FormGrid className="sm:grid-cols-1 lg:grid-cols-1">
              <SelectField id="f_sell_status" label="Status" name="status" defaultValue={request.status}>
                {Object.entries(SELL_STATUS).map(([value, [label]]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <TextAreaField id="f_sell_notes" label="Staff notes" name="notes" defaultValue={request.notes ?? ""} maxLength={2000} />
            </FormGrid>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy}>
                <T>Save request</T>
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                <T>Cancel</T>
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
