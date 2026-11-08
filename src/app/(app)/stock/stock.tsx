"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Note, Status, TableCard } from "@/components/parts";
import { useProductFilters } from "@/components/product-filters";
import { T, useT } from "@/components/t";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import type { Product } from "@/lib/types";
import { useSend } from "@/lib/use-send";

const LOW = 5;

/** One row's controls: a number of pieces, then "Add" or "Remove". The row shows what the server holds afterwards. */
function Adjust({ item, disabled, onSend }: { item: Product; disabled: boolean; onSend: (delta: number) => Promise<boolean> }) {
  const t = useT();
  const [amount, setAmount] = useState("1");
  const pieces = Number(amount);
  const valid = Number.isInteger(pieces) && pieces > 0;
  const go = async (sign: 1 | -1) => {
    if (!valid) return;
    if (await onSend(sign * pieces)) setAmount("1");
  };
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Input
        type="number"
        min="1"
        step="1"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        style={{ width: 84 }}
        className="num bg-card text-end"
        aria-label={`${t("Pieces")}: ${item.nameEn}`}
      />
      <Button type="button" variant="outline" size="sm" className="bg-card" disabled={disabled || !valid || item.stock < pieces} onClick={() => void go(-1)}>
        <Minus aria-hidden="true" />
        <T>Remove</T>
      </Button>
      <Button type="button" variant="gold" size="sm" disabled={disabled || !valid} onClick={() => void go(1)}>
        <Plus aria-hidden="true" />
        <T>Add</T>
      </Button>
    </div>
  );
}

export function Stock({ items, requireStock, ar }: { items: Product[]; requireStock: boolean; ar: boolean }) {
  const { busy, send } = useSend();
  const { can } = usePermissions();
  const named = (en: string, arabic?: string) => (ar && arabic) || en;
  // The search and the filters are shared with the Products screen.
  const { shown, search, filters } = useProductFilters(items, ar);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {search}
        <span className="text-sm text-muted-foreground">
          <T>Total pieces</T>: <b className="num">{items.reduce((sum, item) => sum + item.stock, 0)}</b>
        </span>
      </div>
      {filters}
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Product (EN / AR)</T></TableHead>
              <TableHead scope="col" className="w-36"><T>Stock</T></TableHead>
              <TableHead scope="col" className="text-end"><T>Change stock</T></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="font-medium">{ar ? item.nameAr || item.nameEn : item.nameEn}</span>
                  <Note>{ar ? item.nameEn : item.nameAr}</Note>
                  <Note>
                    {named(item.categoryName, item.categoryNameAr)} · <T>{item.karat === 999 ? "999" : `${item.karat}K`}</T> · {formatNumber(item.weightGrams, 4)} g
                  </Note>
                </TableCell>
                <TableCell>
                  <div className="grid justify-items-start gap-1">
                    <b className="num text-base">{item.stock}</b>
                    {item.stock === 0 ? <Status tone="bad"><T>Out of stock</T></Status> : item.stock <= LOW ? <Status tone="warn"><T>Low stock</T></Status> : null}
                    {!requireStock ? <Note><T>Not limited by stock</T></Note> : null}
                  </div>
                </TableCell>
                <TableCell>
                  {can("products:edit") ? (
                    <Adjust
                      item={item}
                      disabled={busy}
                      onSend={(delta) => send("POST", `/admin/catalog/products/${item.id}/stock`, { delta }, { done: delta > 0 ? "Stock added" : "Stock removed" })}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      {shown.length === 0 ? <p className="text-sm text-muted-foreground"><T>No products match.</T></p> : null}
    </>
  );
}
