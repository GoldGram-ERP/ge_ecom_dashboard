"use client";

import { Minus, Plus } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Note, SelectField, Status, TableCard } from "@/components/parts";
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
  const t = useT();
  const [query, setQuery] = useState("");
  const named = (en: string, arabic?: string) => (ar && arabic) || en;
  // The filters: "" means all. Their lists are the values the products actually use.
  const [filters, setFilters] = useState({ category: "", type: "", maker: "", karat: "", weight: "", status: "" });
  const pick = (key: keyof typeof filters) => (event: ChangeEvent<HTMLSelectElement>) => setFilters((prev) => ({ ...prev, [key]: event.target.value }));
  const filtering = Object.values(filters).some(Boolean);
  const distinct = (pairs: [string, string][]) => [...new Map(pairs).entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }));
  const categories = distinct(items.map((item) => [String(item.categoryId), named(item.categoryName, item.categoryNameAr)]));
  const types = distinct(items.map((item) => [String(item.typeId), named(item.typeName, item.typeNameAr)]));
  const makers = distinct(items.map((item) => [String(item.manufacturerId), named(item.manufacturerName, item.manufacturerNameAr)]));
  const karats = [...new Set(items.map((item) => item.karat))].sort((a, b) => a - b);
  const weights = [...new Set(items.map((item) => item.weightGrams))].sort((a, b) => a - b);
  const needle = query.trim().toLowerCase();
  const shown = items.filter(
    (item) =>
      (!needle || `${item.nameEn} ${item.nameAr} ${item.categoryName} ${item.typeName}`.toLowerCase().includes(needle)) &&
      (!filters.category || String(item.categoryId) === filters.category) &&
      (!filters.type || String(item.typeId) === filters.type) &&
      (!filters.maker || String(item.manufacturerId) === filters.maker) &&
      (!filters.karat || String(item.karat) === filters.karat) &&
      (!filters.weight || String(item.weightGrams) === filters.weight) &&
      (!filters.status || (filters.status === "active") === item.active),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search products")} aria-label={t("Search products")} className="max-w-xs bg-card" />
        <span className="text-sm text-muted-foreground">
          <T>Total pieces</T>: <b className="num">{items.reduce((sum, item) => sum + item.stock, 0)}</b>
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <SelectField label="Category" value={filters.category} onChange={pick("category")}>
          <option value="">All categories</option>
          {categories.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </SelectField>
        <SelectField label="Type" value={filters.type} onChange={pick("type")}>
          <option value="">All types</option>
          {types.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </SelectField>
        <SelectField label="Manufacturer" value={filters.maker} onChange={pick("maker")}>
          <option value="">All manufacturers</option>
          {makers.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </SelectField>
        <SelectField label="Karat" value={filters.karat} onChange={pick("karat")}>
          <option value="">All karats</option>
          {karats.map((karat) => (
            <option key={karat} value={String(karat)}>{karat === 999 ? "999" : `${karat}K`}</option>
          ))}
        </SelectField>
        <SelectField label="Weight (g)" value={filters.weight} onChange={pick("weight")}>
          <option value="">All weights</option>
          {weights.map((weight) => (
            <option key={weight} value={String(weight)}>{formatNumber(weight, 4)}</option>
          ))}
        </SelectField>
        <SelectField label="Status" value={filters.status} onChange={pick("status")}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
      </div>
      {filtering ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{shown.length} / {items.length}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilters({ category: "", type: "", maker: "", karat: "", weight: "", status: "" })}>
            <T>Clear filters</T>
          </Button>
        </div>
      ) : null}
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
