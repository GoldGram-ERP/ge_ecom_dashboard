"use client";

import { T } from "@/components/t";
import { Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Modal } from "@/components/modal";
import { FormGrid, Note, OnOffField, Status, TableCard, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { formatEgp, moneyParseMessage, parseEgpToPiastres, piastresToInput, totalLaborPiastres } from "@/lib/money";
import type { Product } from "@/lib/types";
import { useSend } from "@/lib/use-send";

const LABELS = {
  "cashback.withPackagingPiastres": "Refund with packaging",
  "cashback.withoutPackagingPiastres": "Refund without packaging",
  "cashback.valid": "Valid",
};

const AMOUNTS = [
  ["withPackagingPiastres", "Refund with packaging (EGP)"],
  ["withoutPackagingPiastres", "Refund without packaging (EGP)"],
] as const;

// Several products share a name (nine "Gold bar"), so the weight tells them apart.
const nameOf = (product: Product, ar = false) =>
  ar ? `${product.nameAr || product.nameEn} ${formatNumber(product.weightGrams, 4)} جم` : `${product.nameEn} ${formatNumber(product.weightGrams, 4)} g`;

/**
 * The table of the file's V.cash: the two refunds, the labor and whether the policy is valid, per product.
 * The refunds and the switch change in the row's "Edit" dialog; the labor is the product's own, set on the product.
 */
export function CashbackTable({ products, ar }: { products: Product[]; ar: boolean }) {
  const { busy, send } = useSend();
  const [editing, setEditing] = useState<Product | null>(null);

  /** Saves the two typed EGP amounts as piastres. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const cashback: Record<string, number | boolean> = { valid: form.get("valid") === "1" };
    for (const [field, label] of AMOUNTS) {
      const amount = parseEgpToPiastres(String(form.get(field) ?? ""));
      if (!amount.ok) {
        toast(`${label}: ${moneyParseMessage(amount.reason)}`);
        return;
      }
      cashback[field] = amount.piastres;
    }
    const saved = await send("PATCH", `/admin/catalog/products/${editing.id}`, { cashback }, { done: "Cashback saved", labels: LABELS });
    if (saved) setEditing(null);
  }

  return (
    <TableCard>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col"><T>Product (EN / AR)</T></TableHead>
            <TableHead scope="col" className="text-end">
              <T>Refund with packaging</T>
            </TableHead>
            <TableHead scope="col" className="text-end">
              <T>Refund without packaging</T>
            </TableHead>
            <TableHead scope="col" className="text-end">
              <T>Total labor</T>
            </TableHead>
            <TableHead scope="col"><T>Valid</T></TableHead>
            <TableHead scope="col">
              <span className="sr-only"><T>Actions</T></span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const name = nameOf(product, ar);
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <b className="font-medium">{ar ? product.nameAr : product.nameEn}</b>
                  <Note>{ar ? product.nameEn : product.nameAr}</Note>
                </TableCell>
                {AMOUNTS.map(([field]) => (
                  <TableCell key={field} className="num text-end">
                    {formatEgp(product.cashback[field])}
                  </TableCell>
                ))}
                <TableCell className="num text-end">{formatEgp(totalLaborPiastres(product))}</TableCell>
                <TableCell>
                  <Status tone={product.cashback.valid ? "ok" : "mute"}><T>{product.cashback.valid ? "Valid" : "Not valid"}</T></Status>
                </TableCell>
                <TableCell className="text-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-card"
                    aria-label={`Edit cashback of ${name}`}
                    disabled={busy}
                    onClick={() => setEditing(product)}
                  >
                    <Pencil aria-hidden="true" />
                    <T>Edit</T>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {editing ? (
        <Modal title={`Cashback of ${nameOf(editing, ar)}`} description="What the customer gets back when reselling the item." onClose={() => setEditing(null)}>
          <form className="grid gap-4" onSubmit={save} noValidate>
            <FormGrid className="lg:grid-cols-2">
              {AMOUNTS.map(([field, label]) => (
                <TextField key={field} label={label} name={field} defaultValue={piastresToInput(editing.cashback[field])} type="number" min="0" step="any" />
              ))}
              <OnOffField on={editing.cashback.valid} label="Offered to customers" name="valid" yes="Valid" no="Not valid" />
            </FormGrid>
            <Note>
              <T>Total labor</T>: <span className="num">{formatEgp(totalLaborPiastres(editing))}</span> <T>EGP</T>. <T>It comes from the product: change it in Products, Edit, Labor per gram.</T>
            </Note>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy}>
                <T>Save cashback</T>
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                <T>Cancel</T>
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </TableCard>
  );
}
