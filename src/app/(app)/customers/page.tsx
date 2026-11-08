import { T } from "@/components/t";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { CountCards } from "@/components/count-cards";
import { EmptyRow, Intro, LinkTabs, Note, Status } from "@/components/parts";
import { Card } from "@/components/ui/card";
import { LinkRow } from "@/components/link-row";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serverGet } from "@/lib/api-server";
import { formatStamp } from "@/lib/format";
import { buildHref, firstParam, parsePage } from "@/lib/query";
import type { CustomerList } from "@/lib/types";
import { CustomerButtons } from "./customer-buttons";
import { CustomerRows, CustomerTools } from "./customer-tools";
import { type CustomerQuery, customersApiQuery, customersHref, DOCUMENT_STATUSES } from "./href";

/** "ACTIVE" is the server's word; staff read "Active". */
const sentence = (word: string) => word.charAt(0) + word.slice(1).toLowerCase();

// Customer management (AC-25): accounts, their orders and their identity review. Every filter
// lives in the URL; the server filters, counts and pages.
export default async function CustomersPage(props: PageProps<"/customers">) {
  const raw = await props.searchParams;
  const account = firstParam(raw.account);
  const doc = firstParam(raw.doc);
  const pageSize = firstParam(raw.pageSize);
  const query: CustomerQuery = {
    account: ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(account) ? account : "",
    kyc: firstParam(raw.kyc) === "pending" ? "pending" : "",
    name: firstParam(raw.name),
    email: firstParam(raw.email),
    phone: firstParam(raw.phone),
    doc: DOCUMENT_STATUSES.includes(doc) ? doc : "",
    pageSize: pageSize === "25" || pageSize === "50" ? Number(pageSize) : 10,
  };
  const page = parsePage(raw.page);

  const data = await serverGet<CustomerList>(buildHref("/admin/customers", customersApiQuery(query, page)));
  const { counts } = data;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  // Up to six page numbers, as a window around the current page.
  const firstShown = Math.max(1, Math.min(page - 2, pages - 5));
  const shown = Array.from({ length: Math.min(pages, 6) }, (_, index) => firstShown + index);

  return (
    <>
      <Intro>
        <T>Manage customer accounts, orders and identity documents. Open a customer for the full
        profile; KYC review happens in the Documents tab.</T>
      </Intro>
      <CountCards
        current={query.account || "all"}
        cards={[
          { key: "all", label: "Total", count: counts.total, note: "All accounts", href: customersHref({ ...query, account: "" }) },
          { key: "ACTIVE", label: "Active", count: counts.active, note: "Can transact", href: customersHref({ ...query, account: "ACTIVE" }) },
          { key: "INACTIVE", label: "Inactive", count: counts.inactive, note: "No recent activity", href: customersHref({ ...query, account: "INACTIVE" }) },
          { key: "SUSPENDED", label: "Suspended", count: counts.suspended, note: "Blocked by an admin", href: customersHref({ ...query, account: "SUSPENDED" }) },
        ]}
      />

      <Card className="gap-0 overflow-hidden pb-0">
        <div className="grid gap-4 px-4 pb-4">
          <LinkTabs
            current={query.kyc || "all"}
            items={[
              { key: "all", label: "All customers", href: customersHref({ ...query, kyc: "" }) },
              { key: "pending", label: `Pending approval (${counts.kycPending})`, href: customersHref({ ...query, kyc: "pending" }) },
            ]}
          />
          <CustomerTools query={query} />
        </div>
        <Table className="[&_td]:px-3 [&_th]:px-3 [&_td:first-child]:ps-4 [&_th:first-child]:ps-4 [&_td:last-child]:pe-4 [&_th:last-child]:pe-4">
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>ID</T></TableHead>
              <TableHead scope="col"><T>Name</T></TableHead>
              <TableHead scope="col"><T>Email</T></TableHead>
              <TableHead scope="col"><T>Phone</T></TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
              <TableHead scope="col"><T>Document status</T></TableHead>
              <TableHead scope="col" className="hidden 2xl:table-cell"><T>Date of birth</T></TableHead>
              <TableHead scope="col"><T>Last login</T></TableHead>
              <TableHead scope="col"><T>Created at</T></TableHead>
              <TableHead scope="col" className="text-end">
                <T>Actions</T>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <EmptyRow colSpan={10}><T>No customers match these filters. Clear a filter or pick another card.</T></EmptyRow>
            ) : (
              data.items.map((customer) => (
                <LinkRow key={customer.id} href={`/customers/${customer.id}`}>
                  <TableCell className="text-muted-foreground">{customer.id}</TableCell>
                  <TableCell>
                    <Link href={`/customers/${customer.id}`} className="font-medium text-secondary-foreground underline-offset-4 hover:underline">
                      {customer.name}
                    </Link>
                    <Note>{customer.nationality}</Note>
                  </TableCell>
                  <TableCell className="max-w-56 truncate" title={customer.email}>
                    {customer.email}
                  </TableCell>
                  <TableCell className="num">{customer.mobile || "—"}</TableCell>
                  <TableCell>
                    <Status tone={customer.account === "ACTIVE" ? "ok" : customer.account === "SUSPENDED" ? "bad" : "mute"}>
                      <T>{sentence(customer.account)}</T>
                    </Status>
                  </TableCell>
                  <TableCell>
                    <Status tone={customer.kyc === "Approved" ? "ok" : customer.kyc === "Pending approval" ? "warn" : "mute"}>
                      <T>{customer.kyc}</T>
                    </Status>
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell">{customer.dateOfBirth || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <T>{customer.lastLoginAt ? formatStamp(customer.lastLoginAt) : "Never"}</T>
                  </TableCell>
                  <TableCell className="text-muted-foreground"><T>{formatStamp(customer.createdAt)}</T></TableCell>
                  <TableCell>
                    <CustomerButtons id={customer.id} name={customer.name} suspended={customer.account === "SUSPENDED"} />
                  </TableCell>
                </LinkRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            <T>Page</T> {data.page} <T>of</T> {pages} · {data.total} <T>total</T>
          </span>
          <CustomerRows query={query} />
          <nav aria-label="Pages" className="ms-auto flex flex-wrap items-center gap-1.5">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={customersHref(query, page - 1)} scroll={false}>
                  <ChevronLeft className="rtl:rotate-180" />
                  <T>Previous</T>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="rtl:rotate-180" />
                <T>Previous</T>
              </Button>
            )}
            {shown.map((number) => (
              <Button key={number} variant={number === page ? "gold" : "outline"} size="sm" className="min-w-9 px-0" asChild>
                <Link href={customersHref(query, number)} scroll={false} aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined}>
                  {number}
                </Link>
              </Button>
            ))}
            {page < pages ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={customersHref(query, page + 1)} scroll={false}>
                  <T>Next</T>
                  <ChevronRight className="rtl:rotate-180" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <T>Next</T>
                <ChevronRight className="rtl:rotate-180" />
              </Button>
            )}
          </nav>
        </div>
      </Card>
    </>
  );
}
