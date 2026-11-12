import { T } from "@/components/t";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { OrderAction } from "@/components/order-action";
import { OrderStatusField } from "@/components/order-status";
import { Intro, Note, Status } from "@/components/parts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT, isArabic, serverGet, serverGetOrNull } from "@/lib/api-server";
import { formatDateTime, formatNumber } from "@/lib/format";
import { deliveryText, humanise, orderButton } from "@/lib/labels";
import { formatEgp, formatSigned } from "@/lib/money";
import type { OrderDetail, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

// What each recorded move is called: the same words as the toasts.
const EVENT_NAMES: Record<string, string> = {
  place: "Order placed",
  placed: "Order placed",
  cancel: "Order cancelled",
  verify: "Payment verified",
  accept: "Accepted at the quoted price",
  requote: "Re-quoted at the current price",
  cancel_refund: "Cancelled, refund started",
  confirm: "Order confirmed",
  done: "Order completed",
  refund: "Refund started",
  approve_refund: "Refund approved",
};

const TABLE =
  "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:text-xs [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";
// One line of the "Amount (EGP)" card: what it is on one side, the figure on the other.
const LINE = "flex items-center justify-between gap-3 py-2.5";

function BackToOrders() {
  return (
    <Button variant="outline" size="sm" className="w-fit" asChild>
      <Link href="/orders">
        <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
        <T>Back to orders</T>
      </Link>
    </Button>
  );
}

// Not in the dashboard file: the order page the owner agreed to (SPEC section 9, point 6).
// It is laid out like the file's KYC review: a card of facts beside a column of sections.
export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const ar = await isArabic();
  const t = await getT();
  const [order, settings] = await Promise.all([
    serverGetOrNull<OrderDetail>(`/admin/orders/${encodeURIComponent(id)}`),
    serverGet<Settings>("/admin/settings"),
  ]);

  if (!order) {
    return (
      <>
        <BackToOrders />
        <Intro><T>There is no order at this address. Open it from the orders list.</T></Intro>
      </>
    );
  }

  const [deliveryType, deliveryPlace] = deliveryText(order.fulfilment, (ar && order.zoneNameAr) || order.zoneName);
  const difference = order.differencePiastres ?? 0;
  const facts: [string, string][] = [
    ["Customer", order.customerName],
    ["Email", order.email || "—"],
    ["Phone", order.phone || "—"],
    ["Reference number", order.paymentReference || "—"],
    ...(order.nationalId ? ([["National ID / passport", order.nationalId]] as [string, string][]) : []),
    ["Address", [order.street, order.apartment].filter(Boolean).join(", ") || "—"],
    ["Governorate", (ar ? order.governorateNameAr : order.governorateNameEn) || (order.governorate ? humanise(order.governorate) : "—")],
    ["Delivery address", order.deliveryAddress || "—"],
    ["Notes", order.notes || "—"],
    ["Payment", (ar && order.paymentMethodNameAr) || order.paymentMethodName],
    ["Delivery", deliveryPlace ? `${t(deliveryType)} · ${t(deliveryPlace)}` : t(deliveryType)],
  ];

  const action = orderButton(order.status, order.overTolerance, order.refunded);

  return (
    <>
      <BackToOrders />
      {/* The header answers "which order, in what state, for how much, and what do I do next". */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-2xl">
            <span className="num">#{order.id}</span> <span className="text-muted-foreground">·</span>{" "}
            <span className="text-lg text-muted-foreground">{order.reference}</span>
          </h2>
          {/* The status dropdown stands where the read-only status badges were; the list keeps the badges. */}
          <div className="mt-2.5">
            <OrderStatusField id={order.id} status={order.status} statusOptions={order.statusOptions} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {order.refunded ? <Status tone="mute"><T>Refunded</T></Status> : null}
            {order.overTolerance ? <Status tone="bad"><T>Over tolerance</T></Status> : null}
            <span className="text-xs text-muted-foreground"><T>{formatDateTime(order.createdAt)}</T></span>
          </div>
        </div>
        <div className="ms-auto flex items-center gap-4">
          <div className="text-end">
            <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase"><T>Total · EGP</T></span>
            <b className="num text-2xl font-medium text-secondary-foreground">{formatEgp(order.quotedTotalPiastres)}</b>
          </div>
          {action ? (
            <OrderAction
              id={order.id}
              status={order.status}
              overTolerance={order.overTolerance}
              refunded={order.refunded}
              tolerancePct={settings.tolerancePct}
            />
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Customer and delivery</T></CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {facts
                .filter(([, value]) => value !== "—")
                .map(([label, value]) => (
                <div className="py-2.5 first:pt-0 last:pb-0" dir="auto" key={label}>
                  <dt className="text-xs text-muted-foreground"><T>{label}</T></dt>
                  <dd className="[overflow-wrap:anywhere]">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>Payment proof</T></CardTitle>
            </CardHeader>
            <CardContent>
              {order.proofs?.length ? (
                <div className="grid gap-4">
                  {/* What the pictures add up to: after a re-quote above the paid amount, only the difference is owed. */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span>
                      <T>Paid by the screenshots</T>: <span className="num">{formatEgp(order.paidPiastres ?? 0)}</span> <T>EGP</T>
                    </span>
                    <span className={cn((order.remainingPiastres ?? 0) > 0 && "font-medium text-destructive")}>
                      <T>Remaining to pay</T>: <span className="num">{formatEgp(order.remainingPiastres ?? 0)}</span> <T>EGP</T>
                    </span>
                  </div>
                  {order.proofs.map((proof, index) => {
                    const src = `/api/admin/orders/${order.id}/proofs/${proof.id}`;
                    return (
                      <div key={proof.id} className="flex flex-wrap items-start gap-4 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0">
                        {/* Only staff can load it: the address needs the admin session. Opens full size in a new tab. */}
                        <a href={src} target="_blank" rel="noreferrer" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                          <Image
                            unoptimized
                            src={src}
                            alt={`Payment proof ${index + 1} of order ${order.id}`}
                            width={220}
                            height={320}
                            className="h-auto max-h-80 w-55 rounded-lg bg-muted object-contain ring-1 ring-foreground/10"
                          />
                        </a>
                        <div className="grid gap-2 text-sm">
                          <b className="font-medium">
                            <T>Transfer</T> <span className="num">{index + 1}</span>
                          </b>
                          <span>
                            <T>Sent by the customer on</T> <span className="num"><T>{formatDateTime(proof.uploadedAt)}</T></span>.
                          </span>
                          {proof.forTotalPiastres !== null ? (
                            <span>
                              <T>Pays the order up to</T> <span className="num">{formatEgp(proof.forTotalPiastres)}</span> <T>EGP</T>.
                            </span>
                          ) : null}
                          <span className="text-muted-foreground"><T>Compare the amount and the time with the order before verifying the payment.</T></span>
                          <Button variant="outline" size="sm" className="w-fit" asChild>
                            <a href={src} target="_blank" rel="noreferrer">
                              <T>Open full size</T>
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground"><T>The customer has not sent a transfer screenshot yet. They can send one from their orders on the website.</T></p>
              )}
            </CardContent>
          </Card>
          {order.kycDocuments && order.kycDocuments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>KYC document</T></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-start gap-4">
                {/* Staff only: the address needs the admin session. Each image opens full size in a new tab. */}
                {order.kycDocuments.map((docId) => (
                  <a key={docId} href={`/api/admin/orders/${order.id}/kyc-document/${docId}`} target="_blank" rel="noreferrer" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <Image
                      unoptimized
                      src={`/api/admin/orders/${order.id}/kyc-document/${docId}`}
                      alt={`KYC document of order ${order.id}`}
                      width={220}
                      height={320}
                      className="h-auto max-h-80 w-55 rounded-lg bg-muted object-contain ring-1 ring-foreground/10"
                    />
                  </a>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground"><T>Uploaded by the customer with the order. Click an image to open it full size.</T></p>
            </CardContent>
          </Card>
          )}
          <Card className="pb-0">
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>Items</T></CardTitle>
            </CardHeader>
            <div className="border-t">
              <Table className={TABLE}>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead scope="col"><T>Item (EN / AR)</T></TableHead>
                    <TableHead scope="col" className="text-end"><T>Metal</T></TableHead>
                    <TableHead scope="col" className="text-end"><T>Labor</T></TableHead>
                    <TableHead scope="col" className="text-end"><T>Unit price</T></TableHead>
                    <TableHead scope="col" className="text-end"><T>Qty</T></TableHead>
                    <TableHead scope="col" className="text-end"><T>Line total</T></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <b className="font-medium">{ar ? item.nameAr : item.nameEn}</b>
                        <Note>{ar ? item.nameEn : item.nameAr}</Note>
                      </TableCell>
                      <TableCell className="num text-end">{formatEgp(item.unitMetalPiastres)}</TableCell>
                      <TableCell className="num text-end">{formatEgp(item.unitLaborPiastres)}</TableCell>
                      <TableCell className="num text-end">{formatEgp(item.unitPricePiastres)}</TableCell>
                      <TableCell className="num text-end">{item.qty}</TableCell>
                      <TableCell className="num text-end">{formatEgp(item.lineTotalPiastres)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>Amount (EGP)</T></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                <div className={cn(LINE, "pt-0")}>
                  <div><T>Subtotal</T></div>
                  <span className="num">{formatEgp(order.subtotalPiastres)}</span>
                </div>
                <div className={LINE}>
                  <div><T>Shipping</T></div>
                  <span className="num">{formatEgp(order.shippingPiastres)}</span>
                </div>
                <div className={LINE}>
                  <div><T>Payment fee</T></div>
                  <span className="num">{formatEgp(order.feePiastres)}</span>
                </div>
                <div className={LINE}>
                  <div>
                    <T>Discount</T>
                    {order.discountPiastres && order.discountName ? <Note>{order.discountName}</Note> : null}
                  </div>
                  {order.discountPiastres ? (
                    <span className="num text-destructive">−{formatEgp(order.discountPiastres)}</span>
                  ) : (
                    <Note><T>None</T></Note>
                  )}
                </div>
                <div className={LINE}>
                  <div>
                    <b className="font-heading text-base font-medium text-secondary-foreground"><T>Total</T></b>
                  </div>
                  <b className="num text-xl font-medium text-secondary-foreground">{formatEgp(order.quotedTotalPiastres)}</b>
                </div>
                <div className={LINE}>
                  <div><T>Re-priced</T></div>
                  {order.live && order.repricedTotalPiastres !== null ? (
                    <span className="num">{formatEgp(order.repricedTotalPiastres)}</span>
                  ) : (
                    <Note><T>Locked</T></Note>
                  )}
                </div>
                <div className={cn(LINE, "pb-0")}>
                  <div>
                    <T>Price difference</T>
                    {order.live && order.status === "pending" && !order.overTolerance ? (
                      <Note><T>Within tolerance</T></Note>
                    ) : null}
                  </div>
                  {order.live && order.differencePiastres !== null ? (
                    <span className="flex flex-wrap items-center justify-end gap-2">
                      {order.overTolerance ? <Status tone="bad"><T>Over tolerance</T></Status> : null}
                      <span className={cn("num whitespace-nowrap", (order.overTolerance || difference < 0) && "text-destructive", !order.overTolerance && difference > 0 && "text-success")}>
                        {formatSigned(difference)} ({formatNumber(order.differencePct ?? 0)}%)
                      </span>
                    </span>
                  ) : (
                    <Note><T>None</T></Note>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>History</T></CardTitle>
            </CardHeader>
            <CardContent>
              {order.events.length === 0 ? (
                <p className="text-sm text-muted-foreground"><T>Nothing recorded yet.</T></p>
              ) : (
                <ul className="divide-y">
                  {order.events.map((event, index) => (
                    <li className="py-2.5 first:pt-0 last:pb-0" dir="auto" key={index}>
                      <T>{event.text ||
                        EVENT_NAMES[event.action ?? ""] ||
                        humanise(event.action || event.status || "update")}</T>
                      <Note>
                        {[event.actor === "system" ? "" : event.actor, t(formatDateTime(event.createdAt)), event.note]
                          .filter(Boolean)
                          .join(" · ")}
                      </Note>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
