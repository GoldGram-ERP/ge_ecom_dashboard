"use client";

import { useState } from "react";
import { Ban, Check, Eye, IdCard, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { Confirm } from "@/components/modal";
import { RowAction, RowActions, RowActionsSeparator } from "@/components/row-actions";
import { useSend } from "@/lib/use-send";

/** A customer row's actions, in one menu: view, documents, orders, edit, then suspend or activate, delete. */
export function CustomerButtons({ id, name, suspended }: { id: number; name: string; suspended: boolean }) {
  const { busy, send } = useSend();
  const [askDelete, setAskDelete] = useState(false);

  return (
    <div className="flex justify-end">
      <RowActions label={`Actions for ${name}`}>
        <RowAction label="View customer" icon={<Eye />} href={`/customers/${id}`} />
        <RowAction label="Documents" icon={<IdCard />} href={`/customers/${id}?tab=documents`} />
        <RowAction label="Orders" icon={<ShoppingCart />} href={`/customers/${id}?tab=orders`} />
        <RowAction label="Edit" need="customers:edit" icon={<Pencil />} href={`/customers/${id}?tab=edit`} />
        <RowActionsSeparator />
        <RowAction
          need="customers:edit"
          label={suspended ? "Activate" : "Suspend"}
          icon={suspended ? <Check /> : <Ban />}
          danger={!suspended}
          disabled={busy}
          onSelect={() =>
            send("POST", `/admin/customers/${id}/${suspended ? "activate" : "suspend"}`, undefined, {
              done: suspended ? "Account active" : "Account suspended",
            })
          }
        />
        <RowAction label="Delete" need="customers:delete" icon={<Trash2 />} danger disabled={busy} onSelect={() => setAskDelete(true)} />
      </RowActions>
      {askDelete ? (
        <Confirm
          question={`Delete ${name}? Their account and KYC records are removed.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/customers/${id}`, undefined, { done: "Customer deleted" });
            setAskDelete(false);
          }}
          onCancel={() => setAskDelete(false)}
        />
      ) : null}
    </div>
  );
}
