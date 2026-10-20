"use client";

import { T } from "@/components/t";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/date-field";
import { Select } from "@/components/select";
import { type OrderQuery, ordersHref } from "./href";

/** The file's `.filters` row. Each change goes into the URL and back to page 1 (S.op=0). */
export function OrderFilters({ query }: { query: OrderQuery }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(change: Partial<OrderQuery>) {
    router.replace(ordersHref({ ...query, ...change }), { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2 border-b p-4">
      <Input
        placeholder="Search order # or reference"
        aria-label="Search order # or reference"
        defaultValue={query.q}
        className="h-9 w-full bg-card sm:w-64"
        onChange={(event) => {
          const text = event.target.value.trim();
          // The file filters on every keystroke; here the list is asked for once typing pauses.
          clearTimeout(timer.current);
          timer.current = setTimeout(() => apply({ q: text }), 300);
        }}
      />
      <Select
        key={`delivery-${query.delivery}`}
        aria-label="Delivery type"
        defaultValue={query.delivery}
        className="w-full sm:w-48"
        onChange={(event) => apply({ delivery: event.target.value })}
      >
        <option value="">All delivery types</option>
        <option value="branch">Pickup</option>
        <option value="delivery">Delivery</option>
        <option value="storage">Storage</option>
      </Select>
      <label className="flex w-full items-center gap-2 text-sm text-muted-foreground sm:w-56">
        <span className="w-10 shrink-0"><T>From</T></span>
        <DateField
          className="min-w-0 flex-1"
          key={`from-${query.from}`}
          aria-label="Created from"
          defaultValue={query.from}
          onChange={(event) => apply({ from: event.target.value })}
        />
      </label>
      <label className="flex w-full items-center gap-2 text-sm text-muted-foreground sm:w-56">
        <span className="w-10 shrink-0"><T>To</T></span>
        <DateField
          className="min-w-0 flex-1"
          key={`to-${query.to}`}
          aria-label="Created to"
          defaultValue={query.to}
          onChange={(event) => apply({ to: event.target.value })}
        />
      </label>
    </div>
  );
}

/** The "Rows" select at the end of the paging row. */
export function RowsSelect({ query }: { query: OrderQuery }) {
  const router = useRouter();
  return (
    <>
      <T>Rows</T>{" "}
      <Select
        key={query.pageSize}
        aria-label="Rows per page"
        defaultValue={query.pageSize}
        className="w-20 text-foreground"
        onChange={(event) =>
          router.replace(ordersHref({ ...query, pageSize: Number(event.target.value) }), {
            scroll: false,
          })
        }
      >
        <option>10</option>
        <option>25</option>
        <option>50</option>
      </Select>
    </>
  );
}
