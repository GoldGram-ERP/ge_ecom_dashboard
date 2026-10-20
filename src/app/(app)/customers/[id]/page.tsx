import { T } from "@/components/t";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { LinkTabs, Note, Status, TableCard } from "@/components/parts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkRow } from "@/components/link-row";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serverGetOrNull } from "@/lib/api-server";
import { formatStamp } from "@/lib/format";
import { deliveryText, paymentBadge } from "@/lib/labels";
import { formatEgp } from "@/lib/money";
import { firstParam } from "@/lib/query";
import type { CustomerDetail } from "@/lib/types";
import { EditTab } from "./edit-tab";
import { KycDecision } from "./kyc-decision";

const sentence = (word: string) => word.charAt(0) + word.slice(1).toLowerCase();

function BackToCustomers() {
  return (
    <Button variant="outline" size="sm" className="w-fit" asChild>
      <Link href="/customers">
        <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
        <T>Back to customers</T>
      </Link>
    </Button>
  );
}

/** "Total orders" and "Total spent": on the overview and above the customer's orders. */
function Statistics({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <b className="num block text-3xl font-medium text-secondary-foreground">{customer.stats.totalOrders}</b>
        <span className="text-xs text-muted-foreground"><T>Total orders</T></span>
      </div>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <b className="num block text-3xl font-medium whitespace-nowrap text-secondary-foreground">
          {formatEgp(customer.stats.totalSpentPiastres)} <small className="font-sans text-xs font-normal text-muted-foreground"><T>EGP</T></small>
        </b>
        <span className="text-xs text-muted-foreground"><T>Total spent</T></span>
      </div>
    </div>
  );
}

// One customer, in four tabs kept in the URL (`?tab=`): Overview, Documents (the KYC review),
// Orders and Edit. Document upload is out of scope (SPEC section 8), so the Documents tab has
// the decision and its history, without images or the checks that read them.
export default async function CustomerPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;
  const wanted = firstParam((await props.searchParams).tab);
  const tab = ["documents", "orders", "edit"].includes(wanted) ? wanted : "overview";
  const customer = await serverGetOrNull<CustomerDetail>(`/admin/customers/${encodeURIComponent(id)}`);

  if (!customer) {
    return (
      <>
        <BackToCustomers />
        <p className="text-sm text-muted-foreground"><T>There is no customer at this address. Open one from the customer list.</T></p>
      </>
    );
  }

  const here = (key: string) => (key === "overview" ? `/customers/${customer.id}` : `/customers/${customer.id}?tab=${key}`);
  const accountTone = customer.account === "ACTIVE" ? "ok" : customer.account === "SUSPENDED" ? "bad" : "mute";
  const kycTone = customer.kyc === "Approved" ? "ok" : customer.kyc === "Pending approval" ? "warn" : "mute";
  const facts: [string, React.ReactNode][] = [
    ["Customer ID", <span className="num" key="v">{customer.id}</span>],
    ["Name", customer.name],
    ["Email", customer.email],
    ["Phone", <span className="num" key="v">{customer.mobile || "—"}</span>],
    ["Date of birth", <span className="num" key="v">{customer.dateOfBirth || "—"}</span>],
    ["Nationality", customer.nationality],
    [customer.idType === "passport" ? "Passport" : "National ID", <span className="num" key="v">{customer.nationalId || "—"}</span>],
    ["Status", <Status tone={accountTone} key="v"><T>{sentence(customer.account)}</T></Status>],
    ["Document status", <Status tone={kycTone} key="v"><T>{customer.kyc}</T></Status>],
    ["Last login", customer.lastLoginAt ? formatStamp(customer.lastLoginAt) : "Never"],
    ["Created at", formatStamp(customer.createdAt)],
  ];

  return (
    <>
      <BackToCustomers />
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">{customer.name}</h2>
        <Status tone={accountTone}><T>{sentence(customer.account)}</T></Status>
        <Status tone={kycTone}><T>{customer.kyc}</T></Status>
      </div>
      <LinkTabs
        current={tab}
        items={[
          { key: "overview", label: "Overview", href: here("overview") },
          { key: "documents", label: "Documents", href: here("documents") },
          { key: "orders", label: `Orders (${customer.stats.totalOrders})`, href: here("orders") },
          { key: "edit", label: "Edit", href: here("edit") },
        ]}
      />

      {tab === "overview" ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase"><T>{label}</T></dt>
                    <dd className="mt-1 font-medium [overflow-wrap:anywhere]"><T>{value}</T></dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>Customer statistics</T></CardTitle>
            </CardHeader>
            <CardContent>
              <Statistics customer={customer} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>KYC documents</T></CardTitle>
              <CardDescription>
                <T>No documents uploaded yet. The customer needs to upload a national ID and a selfie
                before a review can start.</T>
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>KYC decision</T></CardTitle>
              <CardDescription><T>Admins and the Operations team can review. Every decision is logged.</T></CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <KycDecision id={customer.id} kyc={customer.kyc} />
            </CardContent>
          </Card>
          {customer.kycHistory.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg"><T>Review history</T></CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {customer.kycHistory.map((entry, index) => (
                    <li className="py-2.5 first:pt-0 last:pb-0" key={index}>
                      {entry.text}
                      <Note>
                        {entry.adminName} · <T>{formatStamp(entry.createdAt)}</T>
                      </Note>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="grid gap-5">
          <div className="max-w-xl">
            <Statistics customer={customer} />
          </div>
          <TableCard>
            <div className="px-4 py-4">
              <h3 className="text-lg">
                <T>Customer orders</T> <span className="font-sans text-sm text-muted-foreground">({customer.orders.length} <T>total)</T></span>
              </h3>
            </div>
            {customer.orders.length === 0 ? (
              <p className="border-t px-4 py-10 text-center text-sm text-muted-foreground"><T>This customer has no orders yet.</T></p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col"><T>Order</T></TableHead>
                    <TableHead scope="col" className="text-end">
                      <T>Amount (EGP)</T>
                    </TableHead>
                    <TableHead scope="col"><T>Delivery</T></TableHead>
                    <TableHead scope="col"><T>Status</T></TableHead>
                    <TableHead scope="col"><T>Created</T></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.map((order) => {
                    const [label, tone] = paymentBadge(order.status);
                    return (
                      <LinkRow key={order.id} href={`/orders/${order.id}`}>
                        <TableCell>
                          <Link href={`/orders/${order.id}`} className="font-medium underline-offset-4 hover:underline">
                            #{order.id}
                          </Link>
                          <Note>{order.reference}</Note>
                        </TableCell>
                        <TableCell className="num text-end">{formatEgp(order.totalPiastres)}</TableCell>
                        <TableCell><T>{deliveryText(order.fulfilment, null)[0]}</T></TableCell>
                        <TableCell>
                          <Status tone={tone}>{label}</Status>
                          {order.refunded ? <Note><T>Refunded</T></Note> : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground"><T>{formatStamp(order.createdAt)}</T></TableCell>
                      </LinkRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TableCard>
        </div>
      ) : null}

      {tab === "edit" ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Edit customer</T></CardTitle>
            <CardDescription><T>The email is the customer&apos;s sign-in and is not changed here.</T></CardDescription>
          </CardHeader>
          <CardContent>
            <EditTab
              id={customer.id}
              initial={{
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.mobile ?? "",
                dateOfBirth: customer.dateOfBirth ?? "",
                nationality: customer.nationality,
                idType: customer.idType ?? "national_id",
                nationalId: customer.nationalId ?? "",
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
