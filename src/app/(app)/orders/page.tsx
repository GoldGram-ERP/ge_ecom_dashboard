import { T } from "@/components/t";
import Link from "next/link";
import { OrderAction } from "@/components/order-action";
import { Pager } from "@/components/pager";
import { EmptyRow, Intro, Note, Status, TableCard } from "@/components/parts";
import { LinkRow } from "@/components/link-row";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isArabic, serverGet } from "@/lib/api-server";
import { formatNumber, formatStamp } from "@/lib/format";
import { deliveryText, fulfilmentBadge, ORDER_TABS, paymentBadge } from "@/lib/labels";
import { formatEgp, formatSigned } from "@/lib/money";
import { buildHref, firstParam, parsePage } from "@/lib/query";
import type { OrderList, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type OrderQuery, ordersHref } from "./href";
import { OrderFilters, RowsSelect } from "./order-filters";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const VERIFIED = ["processing", "shipping", "ready", "completed"];

// One of the ten count tabs: a link, so the open tab lives in the URL.
const TAB =
  "rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 outline-none transition-[box-shadow,background-color,scale] hover:ring-gold/70 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]";
const TABLE =
  "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:text-xs [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

// The file's V.orders, ordAll() and ordT() (AC-24). The server filters, counts and prices.
export default async function OrdersPage(props: PageProps<"/orders">) {
  const raw = await props.searchParams;
  const tab = firstParam(raw.tab);
  const delivery = firstParam(raw.delivery);
  const from = firstParam(raw.from);
  const to = firstParam(raw.to);
  const pageSize = firstParam(raw.pageSize);
  const query: OrderQuery = {
    tab: ORDER_TABS.some(([key]) => key === tab) ? tab : "all",
    q: firstParam(raw.q),
    delivery: ["storage", "branch", "delivery"].includes(delivery) ? delivery : "",
    from: DAY.test(from) ? from : "",
    to: DAY.test(to) ? to : "",
    pageSize: pageSize === "25" || pageSize === "50" ? Number(pageSize) : 10,
  };
  const page = parsePage(raw.page);

  const ar = await isArabic();
  const [data, settings] = await Promise.all([
    serverGet<OrderList>(
      buildHref("/admin/orders", { ...query, page, pageSize: query.pageSize }),
    ),
    serverGet<Settings>("/admin/settings"),
  ]);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  // A CSV of the orders that match the current filters (the server builds it, Excel opens it).
  const exportHref = buildHref("/api/admin/orders/export", {
    tab: query.tab,
    q: query.q,
    delivery: query.delivery,
    from: query.from,
    to: query.to,
  });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Intro>
          <T>{ar
            ? "الإجمالي = المجموع الفرعي + الشحن + رسوم الدفع. يُعاد تسعير الطلب على سعر الذهب الحالي أثناء انتظار الدفع."
            : "Total = subtotal + shipping + payment fee. Prices are re-checked against the live gold price while a payment waits."}</T>
        </Intro>
        <a
          href={exportHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground ring-1 ring-foreground/10 transition-[box-shadow,scale] outline-none hover:ring-gold/70 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]"
        >
          <T>{ar ? "تصدير إلى إكسل" : "Export to Excel"}</T>
        </a>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto overflow-y-hidden px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0" id="otabs">
        {ORDER_TABS.map(([key, label]) => {
          const flag = key === "diff" && data.counts.diff > 0;
          return (
            <Link
              key={key}
              href={ordersHref({ ...query, tab: key })}
              scroll={false}
              className={cn(TAB, "min-w-32 shrink-0 sm:min-w-0", query.tab === key && "bg-accent ring-2 ring-gold hover:ring-gold")}
              aria-current={query.tab === key ? "true" : undefined}
            >
              {/* Count, a space, then the word: the link is read as "12 Pending". */}
              <b className={cn("num block text-2xl font-medium", flag ? "text-destructive" : "text-secondary-foreground")}>
                {data.counts[key]}
              </b>{" "}
              <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <T>{label}</T>
                {flag ? <i aria-hidden="true" className="size-1.5 rounded-full bg-destructive" /> : null}
              </span>
            </Link>
          );
        })}
      </div>
      <TableCard>
        <OrderFilters query={query} />
        <div id="ot">
          <Table className={TABLE}>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead scope="col"><T>Order</T></TableHead>
                <TableHead scope="col"><T>Payment</T></TableHead>
                <TableHead scope="col" className="text-end"><T>Amount (EGP)</T></TableHead>
                <TableHead scope="col"><T>Price check</T></TableHead>
                <TableHead scope="col"><T>Delivery</T></TableHead>
                <TableHead scope="col"><T>Status</T></TableHead>
                <TableHead scope="col">
                  <span className="sr-only"><T>Action</T></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <EmptyRow colSpan={7}><T>No orders match these filters. Clear a filter or pick another tab.</T></EmptyRow>
              ) : (
                data.items.map((order) => {
                  const [deliveryType, deliveryPlace] = deliveryText(order.fulfilment, (ar && order.zoneNameAr) || order.zoneName);
                  const fulfilment = fulfilmentBadge(order.status, order.fulfilment);
                  const payment = paymentBadge(order.status);
                  const difference = order.differencePiastres ?? 0;
                  return (
                    <LinkRow key={order.id} href={`/orders/${order.id}`}>
                      {/* Seven columns, each answering one question, so the row fits a laptop without scrolling. */}
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-medium text-secondary-foreground hover:underline">
                          #{order.id}
                        </Link>
                        <Note className="num">{order.reference}</Note>
                        <Note><T>{formatStamp(order.createdAt)}</T></Note>
                      </TableCell>
                      <TableCell>
                        {(ar && order.paymentMethodNameAr) || order.paymentMethodName}
                        <Note>
                          <T>Fee</T> <span className="num">{formatEgp(order.feePiastres)}</span>
                        </Note>
                      </TableCell>
                      <TableCell className="text-end">
                        <span className="num text-base">{formatEgp(order.initialPiastres)}</span>
                        <Note className="num">
                          <T>Sub</T> {formatEgp(order.subtotalPiastres)} <T>· Ship</T> {formatEgp(order.shippingPiastres)}
                          <T>{VERIFIED.includes(order.status) ? ` · Verified ${formatEgp(order.quotedTotalPiastres)}` : ""}</T>
                        </Note>
                        {order.discountPiastres ? (
                          <Note className="text-destructive">
                            <span className="num">−{formatEgp(order.discountPiastres)}</span> {order.discountName}
                          </Note>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {order.live && order.repricedTotalPiastres !== null && order.differencePiastres !== null ? (
                          <>
                            <span className="num">{formatEgp(order.repricedTotalPiastres)}</span>{" "}
                            <span
                              className={cn(
                                "num text-xs",
                                (order.overTolerance || difference < 0) && "text-destructive",
                                !order.overTolerance && difference > 0 && "text-success",
                              )}
                            >
                              {formatSigned(difference)} ({formatNumber(order.differencePct ?? 0)}%)
                            </span>
                            <div className="mt-1">
                              {order.overTolerance ? (
                                <Status tone="bad"><T>Over tolerance</T></Status>
                              ) : order.status === "pending" ? (
                                <Note><T>Within tolerance</T></Note>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <Note><T>Locked</T></Note>
                        )}
                      </TableCell>
                      <TableCell>
                        {deliveryType}
                        <Note>{deliveryPlace}</Note>
                        <div className="mt-1">
                          <Status tone={fulfilment[1]}>{fulfilment[0]}</Status>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Status tone={payment[1]}>{payment[0]}</Status>
                        {order.refunded ? <Note><T>Refunded</T></Note> : null}
                      </TableCell>
                      <TableCell className="text-end">
                        <OrderAction
                          id={order.id}
                          status={order.status}
                          overTolerance={order.overTolerance}
                          refunded={order.refunded}
                          tolerancePct={settings.tolerancePct}
                        />
                      </TableCell>
                    </LinkRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <Pager
            previous={page > 1 ? ordersHref(query, page - 1) : null}
            next={page < pages ? ordersHref(query, page + 1) : null}
            text={`Page ${data.page} of ${pages} · ${data.total} orders`}
          >
            <RowsSelect query={query} />
          </Pager>
        </div>
      </TableCard>
    </>
  );
}
