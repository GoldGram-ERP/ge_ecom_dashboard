"use client";

import { T } from "@/components/t";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { CountCards } from "@/components/count-cards";
import { Confirm, Modal } from "@/components/modal";
import { FormGrid, Intro, Note, OnOffField, Status, TableCard, TextField } from "@/components/parts";
import { RowAction, RowActions, RowActionsSeparator } from "@/components/row-actions";
import { toast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildHref } from "@/lib/query";
import type { ProductType } from "@/lib/types";
import { useSend } from "@/lib/use-send";

const LABELS = { nameEn: "Name (EN)", nameAr: "الاسم (AR)" };

/** The "Product types" tab of the file's V.cats. */
export function ProductTypes({ items, filter, ar }: { items: ProductType[]; filter: string; ar: boolean }) {
  const { busy, send } = useSend();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ProductType | null>(null);
  const close = () => {
    setAdding(false);
    setEditing(null);
  };
  const [deleting, setDeleting] = useState<ProductType | null>(null);
  const shown = items.filter((item) => filter === "all" || (filter === "active") === item.active);
  const here = (f: string) => buildHref("/catalog/types", { f });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nameEn = String(form.get("nameEn")).trim();
    if (!nameEn) {
      toast("Give the item a name");
      return;
    }
    const added = await send(
      editing ? "PATCH" : "POST",
      editing ? `/admin/catalog/types/${editing.id}` : "/admin/catalog/types",
      {
        // the status select exists only while editing
        ...(editing ? { active: form.get("active") === "1" } : {}), nameEn,
        nameAr: String(form.get("nameAr")).trim(),
        // The price master is not shown: a new type is priced from the gold master, an existing one keeps its own.
        ...(editing ? {} : { master: "gold" }),
      },
      { done: editing ? "Item saved" : "Item added", labels: LABELS },
    );
    if (added) close();
  }

  const form = (
    <form key={editing?.id ?? "new"} className="grid gap-4" onSubmit={save} noValidate>
      <FormGrid className={editing ? "lg:grid-cols-2" : undefined}>
        <TextField id="f_ty_n" label="Name (EN)" name="nameEn" defaultValue={editing?.nameEn} type="text" />
        <TextField id="f_ty_a" label="الاسم (AR)" name="nameAr" defaultValue={editing?.nameAr} type="text" dir="rtl" />
        {editing ? <OnOffField on={editing.active} /> : null}
      </FormGrid>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="gold" disabled={busy}>
          <T>Save item</T>
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          <T>Cancel</T>
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="gold" aria-expanded={adding} onClick={() => {
            setEditing(null);
            setAdding(!adding);
          }}>
          {adding ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
          <T>{adding ? "Close form" : "Add product type"}</T>
        </Button>
      </div>
      {adding ? (
        <Card>
          <CardContent>{form}</CardContent>
        </Card>
      ) : null}
      {editing ? (
        <Modal title={`Edit ${(ar && editing.nameAr) || editing.nameEn}`} onClose={close}>
          {form}
        </Modal>
      ) : null}
      <CountCards
        current={filter}
        cards={[
          { key: "all", label: "Total", count: items.length, note: "All items", href: here("") },
          { key: "active", label: "Active", count: items.filter((item) => item.active).length, note: "In use", href: here("active") },
          { key: "inactive", label: "Inactive", count: items.filter((item) => !item.active).length, note: "Deactivated", href: here("inactive") },
        ]}
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Type (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
              <TableHead scope="col">
                <span className="sr-only"><T>Actions</T></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <b className="font-medium">{ar ? item.nameAr : item.nameEn}</b>
                  <Note>{ar ? item.nameEn : item.nameAr}</Note>
                </TableCell>
                <TableCell>
                  <Status tone={item.active ? "ok" : "mute"}><T>{item.active ? "Active" : "Inactive"}</T></Status>
                </TableCell>
                <TableCell className="text-end">
                  <RowActions label={`Actions for ${(ar && item.nameAr) || item.nameEn}`}>
                    <RowAction
                      label="Edit"
                      icon={<Pencil aria-hidden="true" />}
                      disabled={busy}
                      onSelect={() => {
                        setAdding(false);
                        setEditing(item);
                      }}
                    />
                    <RowActionsSeparator />
                    <RowAction label="Delete" icon={<Trash2 aria-hidden="true" />} danger disabled={busy} onSelect={() => setDeleting(item)} />
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      {shown.length === 0 ? <Intro><T>Nothing here yet. Pick another card or add an item.</T></Intro> : null}
      {deleting ? (
        <Confirm
          question={`Delete ${(ar && deleting.nameAr) || deleting.nameEn}?`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/catalog/types/${deleting.id}`, undefined, {
              done: "Item deleted",
              refusals: { IN_USE: "Still used by products. Deactivate it instead." },
            });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
