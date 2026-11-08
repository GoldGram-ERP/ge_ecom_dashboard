"use client";

import { type ChangeEvent, type ReactNode, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { SelectField } from "@/components/parts";
import { T, useT } from "@/components/t";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import type { Product } from "@/lib/types";

/** What the Status filter holds: "" (all), "active" or "inactive". */
export interface StatusFilter {
  value: string;
  onChange: (value: string) => void;
}

const NONE = { category: "", type: "", maker: "", karat: "", weight: "" };

/**
 * The search box and the filters of a product list (Category, Type, Manufacturer, Karat, Weight,
 * Status), shared by the Stock and Products screens so they behave the same. Each list holds only
 * the values the products actually use. Status is kept here unless the screen owns it (Products
 * keeps it in the address, beside its cards) and passes it in as `status`.
 *
 * `shown` is `items` with everything applied; put `search` and `filters` where they belong.
 */
export function useProductFilters(items: Product[], ar: boolean, status?: StatusFilter) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(NONE);
  const [ownStatus, setOwnStatus] = useState("");
  const statusValue = status ? status.value : ownStatus;
  const setStatus = status ? status.onChange : setOwnStatus;

  const named = (en: string, arabic?: string) => (ar && arabic) || en;
  const pick = (key: keyof typeof NONE) => (event: ChangeEvent<HTMLSelectElement>) => setPicked((prev) => ({ ...prev, [key]: event.target.value }));
  const distinct = (pairs: [string, string][]) => [...new Map(pairs).entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }));
  const categories = distinct(items.map((item) => [String(item.categoryId), named(item.categoryName, item.categoryNameAr)]));
  const types = distinct(items.map((item) => [String(item.typeId), named(item.typeName, item.typeNameAr)]));
  const makers = distinct(items.map((item) => [String(item.manufacturerId), named(item.manufacturerName, item.manufacturerNameAr)]));
  const karats = [...new Set(items.map((item) => item.karat))].sort((a, b) => a - b);
  const weights = [...new Set(items.map((item) => item.weightGrams))].sort((a, b) => a - b);

  const needle = query.trim().toLowerCase();
  const shown = items.filter(
    (item) =>
      (!needle || `${item.nameEn} ${item.nameAr} ${item.categoryName} ${item.typeName} ${item.manufacturerName}`.toLowerCase().includes(needle)) &&
      (!picked.category || String(item.categoryId) === picked.category) &&
      (!picked.type || String(item.typeId) === picked.type) &&
      (!picked.maker || String(item.manufacturerId) === picked.maker) &&
      (!picked.karat || String(item.karat) === picked.karat) &&
      (!picked.weight || String(item.weightGrams) === picked.weight) &&
      (!statusValue || (statusValue === "active") === item.active),
  );
  const filtering = Boolean(needle) || Object.values(picked).some(Boolean) || Boolean(statusValue);
  const clear = () => {
    setQuery("");
    setPicked(NONE);
    setStatus("");
  };

  const search: ReactNode = (
    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search products")} aria-label={t("Search products")} className="max-w-xs bg-card" />
  );

  const filters: ReactNode = (
    <>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <SelectField label="Category" value={picked.category} onChange={pick("category")}>
          <option value="">All categories</option>
          {categories.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </SelectField>
        <SelectField label="Type" value={picked.type} onChange={pick("type")}>
          <option value="">All types</option>
          {types.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </SelectField>
        <SelectField label="Manufacturer" value={picked.maker} onChange={pick("maker")}>
          <option value="">All manufacturers</option>
          {makers.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </SelectField>
        <SelectField label="Karat" value={picked.karat} onChange={pick("karat")}>
          <option value="">All karats</option>
          {karats.map((karat) => (
            <option key={karat} value={String(karat)}>{karat === 999 ? "999" : `${karat}K`}</option>
          ))}
        </SelectField>
        <SelectField label="Weight (g)" value={picked.weight} onChange={pick("weight")}>
          <option value="">All weights</option>
          {weights.map((weight) => (
            <option key={weight} value={String(weight)}>{formatNumber(weight, 4)}</option>
          ))}
        </SelectField>
        <SelectField label="Status" value={statusValue} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
      </div>
      {filtering ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{shown.length} / {items.length}</span>
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <T>Clear filters</T>
          </Button>
        </div>
      ) : null}
    </>
  );

  return { shown, search, filters };
}
