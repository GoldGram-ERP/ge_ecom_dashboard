import { T } from "@/components/t";
import { Intro, LinkTabs } from "@/components/parts";
import { Pager } from "@/components/pager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isArabic, serverGet } from "@/lib/api-server";
import { chartPoints } from "@/lib/chart";
import { formatNumber, formatStamp } from "@/lib/format";
import { formatEgp, formatSigned } from "@/lib/money";
import { buildHref, firstParam, parsePage } from "@/lib/query";
import type { PriceBoard, PriceHistory, Settings } from "@/lib/types";
import { MasterPriceForm, SilverPriceForm } from "./price-forms";

const CHART_W = 640;
const CHART_H = 150;

const NAVY = "bg-linear-to-br from-primary to-navy-deep text-white ring-0";
const EYEBROW = "text-xs font-medium tracking-wide text-muted-foreground uppercase";
const TABLE =
  "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:text-xs [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

// The file's V.prices (AC-23). `?karat=` and `?hp=` are its S.karat and S.hp.
export default async function PricesPage(props: PageProps<"/prices">) {
  const query = await props.searchParams;
  const karatText = firstParam(query.karat);
  const karat = karatText === "24" || karatText === "18" ? Number(karatText) : 21;
  const page = parsePage(query.hp);

  const ar = await isArabic();
  const [prices, settings, history] = await Promise.all([
    serverGet<PriceBoard>("/prices"),
    serverGet<Settings>("/admin/settings"),
    serverGet<PriceHistory>(`/admin/prices/history?karat=${karat}&page=${page}`),
  ]);

  const { stats } = history;
  const points = chartPoints(history.chart, CHART_W, CHART_H);
  const pages = Math.max(1, Math.ceil(history.total / history.pageSize));
  const here = (hp: number) => buildHref("/prices", { karat: karat === 21 ? "" : karat, hp: hp > 1 ? hp : "" });

  return (
    <>
      <Intro>
        <T>{ar
          ? "عدّل رقمًا واحدًا هو سعر شراء عيار 21. باقي العيارات تُحسب منه، وللفضة سعرها المستقل."
          : "Edit one number, the 21K buy price. Every other karat is derived from it. Silver has its own master."}</T>
      </Intro>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className={NAVY}>
          <CardContent className="grid gap-5">
            <MasterPriceForm
              // New server values start the fields again.
              key={`${prices.master.buyPiastres}-${prices.master.spreadPiastres}`}
              buyPiastres={prices.master.buyPiastres}
              spreadPiastres={prices.master.spreadPiastres}
              spreadVisible={settings.spreadVisible}
              afterPublish={here(1)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Silver 999</T></CardTitle>
            <CardDescription>
              <T>Separate master. Products of type Silver price from this, not from gold karats.</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SilverPriceForm
              key={`${prices.silver.buyPiastres}-${prices.silver.spreadPiastres}`}
              buyPiastres={prices.silver.buyPiastres}
              spreadPiastres={prices.silver.spreadPiastres}
            />
            <p className="text-xs text-muted-foreground">
              <T>Derived karats scale from 21K: 24K × 24/21, 18K × 18/21, applied to buy and sell,
              rounded to 10 piastres.</T>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card className="pb-0">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-heading text-lg"><T>Price history</T></CardTitle>
            <LinkTabs
              current={String(karat)}
              items={[21, 24, 18].map((k) => ({
                key: String(k),
                label: `${k}K`,
                href: buildHref("/prices", { karat: k === 21 ? "" : k }),
              }))}
            />
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
              <div>
                <span className={EYEBROW}><T>Current sell</T></span>
                <b className="num block text-base font-medium text-secondary-foreground">{formatEgp(stats.currentSellPiastres)}</b>
              </div>
              <div>
                <span className={EYEBROW}><T>Change</T></span>
                <b className={`num block text-base font-medium ${stats.changePiastres >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatSigned(stats.changePiastres)} ({formatNumber(stats.changePct)}%)
                </b>
              </div>
              <div>
                <span className={EYEBROW}><T>High</T></span>
                <b className="num block text-base font-medium text-secondary-foreground">{formatEgp(stats.highPiastres)}</b>
              </div>
              <div>
                <span className={EYEBROW}><T>Low</T></span>
                <b className="num block text-base font-medium text-secondary-foreground">{formatEgp(stats.lowPiastres)}</b>
              </div>
              <div>
                <span className={EYEBROW}><T>Range</T></span>
                <b className="num block text-base font-medium text-secondary-foreground">{formatEgp(stats.rangePiastres)}</b>
              </div>
            </div>
            <svg
              className="h-36 w-full"
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`${karat}K sell price, last ${history.chart.length} changes`}
            >
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#C6A362" stopOpacity=".35" />
                  <stop offset="1" stopColor="#C6A362" stopOpacity="0" />
                </linearGradient>
              </defs>
              {points.length > 0 ? (
                <>
                  <path d={`M${points.join("L")}L${CHART_W},${CHART_H}L0,${CHART_H}Z`} fill="url(#g)" />
                  <path
                    d={`M${points.join("L")}`}
                    fill="none"
                    stroke="#9C7C40"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : null}
            </svg>
          </CardContent>
          <div className="border-t">
            <Table className={TABLE}>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead scope="col" className="text-end"><T>Previous sell</T></TableHead>
                  <TableHead scope="col" className="text-end"><T>New sell</T></TableHead>
                  <TableHead scope="col" className="text-end"><T>Change</T></TableHead>
                  <TableHead scope="col"><T>Changed at</T></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.items.map((row, index) => (
                  <TableRow key={`${row.changedAt}-${index}`}>
                    <TableCell className="num text-end">{formatEgp(row.previousSellPiastres)}</TableCell>
                    <TableCell className="num text-end">{formatEgp(row.newSellPiastres)}</TableCell>
                    <TableCell className={`num text-end ${row.changePiastres >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatSigned(row.changePiastres)}
                    </TableCell>
                    <TableCell className="text-muted-foreground"><T>{formatStamp(row.changedAt)}</T></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager
              previous={page > 1 ? here(page - 1) : null}
              next={page < pages ? here(page + 1) : null}
              text={`Page ${history.page} of ${pages} · every master change is logged`}
            />
          </div>
        </Card>

        <Card className={NAVY}>
          <CardHeader>
            <CardTitle className="text-xs font-medium tracking-[0.18em] text-gold-light uppercase"><T>Derived per gram</T></CardTitle>
          </CardHeader>
          {/* Not a table: the history table below stays the only one on the screen. */}
          <CardContent id="drv">
            <div className="grid grid-cols-3 gap-2 border-b border-white/15 pb-2 text-xs tracking-wide text-white/60 uppercase">
              <span><T>Per gram</T></span>
              <span className="text-end"><T>Buy</T></span>
              <span className="text-end text-gold-light"><T>Sell</T></span>
            </div>
            {[
              ...prices.karats.map((row) => ({ name: `${row.karat}K`, buy: row.buyPiastres, sell: row.sellPiastres })),
              { name: "Ag 999", buy: prices.silver.buyPiastres, sell: prices.silver.sellPiastres },
            ].map((row) => (
              <div className="num grid grid-cols-3 gap-2 border-b border-white/10 py-2.5 text-base last:border-0 last:pb-0" key={row.name}>
                <span>{row.name}</span>
                <span className="text-end">{formatEgp(row.buy)}</span>
                <span className="text-end text-gold-light">{formatEgp(row.sell)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
