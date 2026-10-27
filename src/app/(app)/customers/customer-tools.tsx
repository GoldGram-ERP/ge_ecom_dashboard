"use client";

import { T } from "@/components/t";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, SlidersHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Modal } from "@/components/modal";
import { SelectField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { api, errorMessage } from "@/lib/api";
import { buildHref } from "@/lib/query";
import type { CustomerList } from "@/lib/types";
import { downloadXlsx } from "@/lib/xlsx";
import { CustomerForm } from "./customer-form";
import { type CustomerQuery, customersApiQuery, customersHref, DOCUMENT_STATUSES } from "./href";
import { usePermissions } from "@/lib/permissions";

/**
 * The row above the customer table: Filters, New customer, Export, Refresh, and the filters
 * panel. Each filter goes into the URL and back to page 1; the server does the filtering.
 */
export function CustomerTools({ query }: { query: CustomerQuery }) {
  const router = useRouter();
  const { can } = usePermissions();
  const filtered = Boolean(query.name || query.email || query.phone || query.doc);
  const [open, setOpen] = useState(filtered);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(change: Partial<CustomerQuery>) {
    router.replace(customersHref({ ...query, ...change }), { scroll: false });
  }

  /** Typed filters wait for a pause in typing before the list is asked for. */
  function applySoon(change: Partial<CustomerQuery>) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(change), 300);
  }

  /** Every customer the current filters match, not only the page on screen, as an Excel file. */
  async function exportExcel() {
    setExporting(true);
    try {
      const rows: CustomerList["items"] = [];
      for (let page = 1; ; page++) {
        const list = await api<CustomerList>(buildHref("/admin/customers", customersApiQuery(query, page, 100)));
        rows.push(...list.items);
        if (rows.length >= list.total || list.items.length === 0) break;
      }
      downloadXlsx("goldgram-customers.xlsx", [
        ["ID", "Name", "Email", "Phone", "Status", "Document status", "Created"],
        ...rows.map((c) => [c.id, c.name, c.email, c.mobile ?? "", c.account, c.kyc, c.createdAt.slice(0, 10)]),
      ]);
      toast(`${rows.length} customers exported`);
    } catch (error) {
      toast(errorMessage(error));
    }
    setExporting(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" aria-expanded={open} aria-controls="customer-filters" onClick={() => setOpen(!open)}>
          <SlidersHorizontal />
          <T>Filters</T>
        </Button>
        {can("customers:add") ? (
        <Button variant="gold" onClick={() => setCreating(true)}>
          <UserPlus />
          <T>New customer</T>
        </Button>
        ) : null}
        <Button variant="outline" disabled={exporting} onClick={exportExcel}>
          <Download />
          <T>Export to Excel</T>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            router.refresh();
            toast("List refreshed");
          }}
        >
          <RefreshCw />
          <T>Refresh</T>
        </Button>
      </div>

      {open ? (
        <div id="customer-filters" className="grid gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <TextField label="Name" defaultValue={query.name} onChange={(event) => applySoon({ name: event.target.value.trim() })} />
          <TextField label="Email" defaultValue={query.email} onChange={(event) => applySoon({ email: event.target.value.trim() })} />
          <TextField label="Phone" defaultValue={query.phone} onChange={(event) => applySoon({ phone: event.target.value.trim() })} />
          <SelectField label="Status" value={query.account} onChange={(event) => apply({ account: event.target.value })}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </SelectField>
          <SelectField label="Document status" value={query.doc} onChange={(event) => apply({ doc: event.target.value })}>
            <option value="">All</option>
            {DOCUMENT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </SelectField>
        </div>
      ) : null}

      {creating ? (
        <Modal title="New customer" description="The account starts Active, with documents still required." onClose={() => setCreating(false)}>
          <CustomerForm
            initial={{ firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", nationality: "Egyptian", idType: "national_id", nationalId: "" }}
            submitLabel="Create customer"
            onSaved={() => {
              setCreating(false);
              // The new account is the newest: page 1 of the unfiltered list shows it.
              router.replace("/customers", { scroll: false });
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      ) : null}
    </>
  );
}

/** The "Rows" select at the end of the paging row. */
export function CustomerRows({ query }: { query: CustomerQuery }) {
  const router = useRouter();
  return (
    <SelectField
      label="Rows"
      className="flex items-center gap-2 [&>label]:text-muted-foreground"
      value={query.pageSize}
      onChange={(event) => router.replace(customersHref({ ...query, pageSize: Number(event.target.value) }), { scroll: false })}
    >
      <option>10</option>
      <option>25</option>
      <option>50</option>
    </SelectField>
  );
}
