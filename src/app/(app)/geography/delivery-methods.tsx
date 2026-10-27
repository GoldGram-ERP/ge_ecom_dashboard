"use client";

import { T } from "@/components/t";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { CountCards } from "@/components/count-cards";
import { Confirm, Modal } from "@/components/modal";
import { FormGrid, Intro, Note, OnOffField, SelectField, Status, TableCard, TextField } from "@/components/parts";
import { RowAction, RowActions, RowActionsSeparator } from "@/components/row-actions";
import { toast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEgp, parseEgpToPiastres, piastresToInput } from "@/lib/money";
import { buildHref } from "@/lib/query";
import type { DeliveryMethod, Zone } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { usePermissions } from "@/lib/permissions";

const LABELS = {
  nameEn: "Name (EN)",
  nameAr: "الاسم (AR)",
  zoneId: "Zone",
  estimatedDays: "Estimated days",
  additionalCostPiastres: "Additional cost",
};

/** The "Delivery methods" tab of the file's V.geo. */
export function DeliveryMethods({
  items,
  zones,
  daysVisible,
  filter,
  ar,
}: {
  items: DeliveryMethod[];
  zones: Zone[];
  daysVisible: boolean;
  filter: string;
  ar: boolean;
}) {
  const { busy, send } = useSend();
  const { can } = usePermissions();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DeliveryMethod | null>(null);
  const close = () => {
    setAdding(false);
    setEditing(null);
  };
  const [deleting, setDeleting] = useState<DeliveryMethod | null>(null);
  const shown = items.filter((item) => filter === "all" || (filter === "active") === item.active);
  const here = (f: string) => buildHref("/geography", { tab: "delivery-methods", f });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nameEn = String(form.get("nameEn")).trim();
    if (!nameEn) {
      toast("Give the item a name");
      return;
    }
    const daysText = String(form.get("estimatedDays")).trim();
    const estimatedDays = Number(daysText);
    const extra = parseEgpToPiastres(String(form.get("extra")));
    if (daysText === "" || !Number.isInteger(estimatedDays) || estimatedDays < 0 || !extra.ok) {
      toast("Fill in every number field");
      return;
    }
    if (zones.length === 0) {
      toast("Add a shipping zone first");
      return;
    }
    const added = await send(
      editing ? "PATCH" : "POST",
      editing ? `/admin/geo/delivery-methods/${editing.id}` : "/admin/geo/delivery-methods",
      {
        // the status select exists only while editing
        ...(editing ? { active: form.get("active") === "1" } : {}),
        nameEn,
        nameAr: String(form.get("nameAr")).trim(),
        zoneId: Number(form.get("zoneId")),
        estimatedDays,
        additionalCostPiastres: extra.piastres,
      },
      { done: editing ? "Item saved" : "Item added", labels: LABELS },
    );
    if (added) close();
  }

  const form = (
    <form key={editing?.id ?? "new"} className="grid gap-4" onSubmit={save} noValidate>
      <FormGrid className={editing ? "lg:grid-cols-2" : undefined}>
        <TextField id="f_dm_n" label="Name (EN)" name="nameEn" defaultValue={editing?.nameEn} type="text" />
        <TextField id="f_dm_a" label="الاسم (AR)" name="nameAr" defaultValue={editing?.nameAr} type="text" dir="rtl" />
        <SelectField id="f_dm_z" label="Zone" name="zoneId" defaultValue={editing?.zoneId}>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {(ar && zone.nameAr) || zone.nameEn}
            </option>
          ))}
        </SelectField>
        <TextField id="f_dm_d" label="Estimated days" name="estimatedDays" defaultValue={editing?.estimatedDays} type="number" min="0" step="any" />
        <TextField id="f_dm_x" label="Additional cost" name="extra" defaultValue={editing ? piastresToInput(editing.additionalCostPiastres) : undefined} type="number" min="0" step="any" />
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
          <T>{adding ? "Close form" : "Add delivery method"}</T>
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
              <TableHead scope="col"><T>Method (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Zone</T></TableHead>
              <TableHead scope="col"><T>Estimated days</T></TableHead>
              <TableHead scope="col"><T>Additional cost</T></TableHead>
              <TableHead scope="col" className="text-end">
                <T>Total cost</T>
              </TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
              <TableHead scope="col">
                <span className="sr-only"><T>Actions</T></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((item) => {
              const zone = zones.find((candidate) => candidate.id === item.zoneId);
              const zoneCost = item.zoneCostPiastres ?? zone?.costPiastres ?? 0;
              // The server's total when it sends one. The spec does not name the field, so
              // without it the cell falls back to the file's own sum (zone + extra).
              const total = item.totalCostPiastres ?? zoneCost + item.additionalCostPiastres;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <b className="font-medium">{ar ? item.nameAr : item.nameEn}</b>
                    <Note>{ar ? item.nameEn : item.nameAr}</Note>
                  </TableCell>
                  <TableCell>{(ar && zone?.nameAr) || item.zoneName || zone?.nameEn || "—"}</TableCell>
                  <TableCell>
                    <span className="num">{item.estimatedDays}</span>
                    {daysVisible ? null : <Note><T>Hidden from customers</T></Note>}
                  </TableCell>
                  <TableCell className="num">{formatEgp(item.additionalCostPiastres)}</TableCell>
                  <TableCell className="text-end">
                    <span className="num text-base text-secondary-foreground">{formatEgp(total)}</span>
                    <Note className="num">
                      <T>Zone</T> {formatEgp(zoneCost)} <T>+ extra</T> {formatEgp(item.additionalCostPiastres)}
                    </Note>
                  </TableCell>
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
              );
            })}
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
            await send("DELETE", `/admin/geo/delivery-methods/${deleting.id}`, undefined, { done: "Item deleted" });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
