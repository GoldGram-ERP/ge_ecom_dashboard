import { T } from "@/components/t";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { OrderAction } from "@/components/order-action";
import { Intro, Note } from "@/components/parts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isArabic, serverGet } from "@/lib/api-server";
import { formatNumber } from "@/lib/format";
import { formatEgp, formatSigned } from "@/lib/money";
import type { Overview, PriceBoard, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

// The four cards at the top: each is a link to the screen that deals with its number.
const KPI =
  "group rounded-xl bg-card p-5 ring-1 ring-foreground/10 outline-none transition-[box-shadow,scale] hover:ring-gold/70 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]";

// Every number comes from the server (AC-22).
export default async function HomePage() {
  const ar = await isArabic();
  const [overview, prices, settings] = await Promise.all([
    serverGet<Overview>("/admin/overview"),
    serverGet<PriceBoard>("/prices"),
    serverGet<Settings>("/admin/settings"),
  ]);
  const { master } = overview;

  const cards = [
    {
      href: "/prices",
      label: "21K buy · EGP / g",
      value: formatEgp(master.buyPiastres),
      note: (
        <>
          <T>Sell</T> {formatEgp(master.sellPiastres)} ·{" "}
          <span className={master.lastChangePiastres >= 0 ? "text-success" : "text-destructive"}>
            {formatSigned(master.lastChangePiastres)} <T>last change</T>
          </span>
        </>
      ),
      hot: false,
    },
    {
      href: "/orders?tab=pending",
      label: "Awaiting verification",
      value: String(overview.awaitingVerification),
      note: `${overview.withPriceDifference} with a price difference`,
      hot: overview.withPriceDifference > 0,
    },
    {
      href: "/customers?kyc=pending",
      label: "KYC review queue",
      value: String(overview.kycQueue),
      note: "Customers pending approval",
      hot: false,
    },
    {
      href: "/orders?tab=refund",
      label: "Refunds to approve",
      value: String(overview.refundsToApprove),
      note: "Cancelled after payment",
      hot: false,
    },
  ];

  return (
    <>
      <Intro>
        <T>{ar
          ? "ما يحتاج قرارًا اليوم: الأسعار وإثباتات الدفع والتحقق والاستردادات."
          : "What needs a decision today: prices, payment proofs, KYC and refunds."}</T>
      </Intro>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={cn(KPI, card.hot && "ring-2 ring-destructive/50")}>
            <span className="flex items-center justify-between text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <T>{card.label}</T>
              <ArrowUpRight aria-hidden="true" className="size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 rtl:-scale-x-100" />
            </span>
            <b className="num mt-2 block text-4xl font-medium text-secondary-foreground">{card.value}</b>
            <small className="mt-1 block text-xs text-muted-foreground"><T>{card.note}</T></small>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* The navy card: today's rates, as the shop quotes them. */}
        <Card className="bg-linear-to-br from-primary to-navy-deep text-white ring-0">
          <CardHeader>
            <CardTitle className="text-xs font-medium tracking-[0.18em] text-gold-light uppercase"><T>Live rates</T></CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Table stack={false}>
              <TableHeader className="bg-transparent">
                <TableRow className="border-white/15">
                  <TableHead className="text-xs tracking-wide text-white/60 uppercase"><T>Per gram</T></TableHead>
                  <TableHead className="text-end text-xs tracking-wide text-white/60 uppercase"><T>Buy</T></TableHead>
                  <TableHead className="text-end text-xs tracking-wide text-gold-light uppercase"><T>Sell</T></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ...prices.karats.map((row) => ({ name: `${row.karat}K`, buy: row.buyPiastres, sell: row.sellPiastres })),
                  { name: "Ag 999", buy: prices.silver.buyPiastres, sell: prices.silver.sellPiastres },
                ].map((row) => (
                  <TableRow key={row.name} className="border-white/10 hover:bg-white/5">
                    <TableCell className="num text-base">{row.name}</TableCell>
                    <TableCell className="num text-end text-base">{formatEgp(row.buy)}</TableCell>
                    <TableCell className="num text-end text-base text-gold-light">{formatEgp(row.sell)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="gold" size="sm" className="w-fit" asChild>
              <Link href="/prices"><T>Update prices</T></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Needs attention</T></CardTitle>
          </CardHeader>
          <CardContent>
            {overview.attention.length === 0 ? (
              <p className="text-sm text-muted-foreground"><T>No payments waiting. Nothing to review.</T></p>
            ) : (
              <ul className="divide-y">
                {overview.attention.map((order) => (
                  <li key={order.id} className="relative flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 [&_button]:relative [&_button]:z-10">
                    <div className="min-w-0">
                      <Link href={`/orders/${order.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        #{order.id}
                      </Link>{" "}
                      · {(ar && order.paymentMethodNameAr) || order.paymentMethodName}
                      <Note>
                        <span className="num">{formatEgp(order.quotedTotalPiastres)}</span> <T>quoted ·</T>{" "}
                        <T>{order.overTolerance ? (
                          <span className="text-destructive">
                            {formatSigned(order.differencePiastres)} ({formatNumber(order.differencePct)}%) <T>price difference</T>
                          </span>
                        ) : (
                          "within tolerance"
                        )}</T>
                      </Note>
                    </div>
                    <OrderAction
                      id={order.id}
                      status="pending"
                      overTolerance={order.overTolerance}
                      refunded={false}
                      tolerancePct={settings.tolerancePct}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
