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
import { formatEgp, parseEgpToPiastres, piastresToInput } from "@/lib/money";
import { buildHref } from "@/lib/query";
import type { Zone } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { usePermissions } from "@/lib/permissions";

const LABELS = { nameEn: "State (EN)", nameAr: "الولاية (AR)", costPiastres: "Shipping cost (EGP)" };

/** The "Shipping zones" tab of the file's V.geo. */
export function Zones({ items, filter, ar }: { items: Zone[]; filter: string; ar: boolean }) {
  const { busy, send } = useSend();
  const { can } = usePermissions();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const close = () => {
    setAdding(false);
    setEditing(null);
  };
  const [deleting, setDeleting] = useState<Zone | null>(null);
  const shown = items.filter((item) => filter === "all" || (filter === "active") === item.active);
  const here = (f: string) => buildHref("/geography", { f });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nameEn = String(form.get("nameEn")).trim();
    if (!nameEn) {
      toast("Give the item a name");
      return;
    }
    const cost = parseEgpToPiastres(String(form.get("cost")));
    if (!cost.ok) {
      toast("Fill in every number field");
      return;
    }
    const added = await send(
      editing ? "PATCH" : "POST",
      editing ? `/admin/geo/zones/${editing.id}` : "/admin/geo/zones",
      {
        // the status select exists only while editing
        ...(editing ? { active: form.get("active") === "1" } : {}), nameEn, nameAr: String(form.get("nameAr")).trim(), costPiastres: cost.piastres },
      // The server takes only the 27 governorates, by their English name: say so when it refuses one.
      { done: editing ? "Item saved" : "Item added", labels: { ...LABELS, nameEn: "State (EN), which must be an Egyptian governorate such as Aswan" } },
    );
    if (added) close();
  }

  const form = (
    <form key={editing?.id ?? "new"} className="grid gap-4" onSubmit={save} noValidate>
      <FormGrid className={editing ? "lg:grid-cols-2" : undefined}>
        <TextField id="f_zone_n" label="State (EN)" name="nameEn" defaultValue={editing?.nameEn} type="text" />
        <TextField id="f_zone_a" label="الولاية (AR)" name="nameAr" defaultValue={editing?.nameAr} type="text" dir="rtl" />
        <TextField id="f_zone_c" label="Shipping cost (EGP)" name="cost" defaultValue={editing ? piastresToInput(editing.costPiastres) : undefined} type="number" min="0" step="any" />
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
        {can("geography:add") ? (
        <Button type="button" variant="gold" aria-expanded={adding} onClick={() => {
            setEditing(null);
            setAdding(!adding);
          }}>
          {adding ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
          <T>{adding ? "Close form" : "Add shipping zone"}</T>
        </Button>
        ) : null}
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
              <TableHead scope="col"><T>State (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Shipping cost (EGP)</T></TableHead>
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
                <TableCell className="num">{formatEgp(item.costPiastres)}</TableCell>
                <TableCell>
                  <Status tone={item.active ? "ok" : "mute"}><T>{item.active ? "Active" : "Inactive"}</T></Status>
                </TableCell>
                <TableCell className="text-end">
                  <RowActions label={`Actions for ${(ar && item.nameAr) || item.nameEn}`}>
                    <RowAction
                      label="Edit" need="geography:edit"
                      icon={<Pencil aria-hidden="true" />}
                      disabled={busy}
                      onSelect={() => {
                        setAdding(false);
                        setEditing(item);
                      }}
                    />
                    <RowActionsSeparator />
                    <RowAction label="Delete" need="geography:delete" icon={<Trash2 aria-hidden="true" />} danger disabled={busy} onSelect={() => setDeleting(item)} />
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
            await send("DELETE", `/admin/geo/zones/${deleting.id}`, undefined, {
              done: "Item deleted",
              refusals: { IN_USE: "Still used by delivery methods. Deactivate it instead." },
            });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
