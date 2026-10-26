import { T } from "@/components/t";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Intro, Status } from "@/components/parts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverGetOrNull } from "@/lib/api-server";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatEgp } from "@/lib/money";
import type { SellRequest } from "@/lib/types";
import { SELL_CONDITION, SELL_HANDOVER, SELL_KIND, SELL_PAYOUT, SELL_STATUS } from "../labels";
import { EditSellRequest } from "./edit-sell-request";

const LINE = "flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0";

function Back() {
  return (
    <Button variant="outline" size="sm" className="w-fit" asChild>
      <Link href="/sell-requests">
        <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
        <T>Back to sell requests</T>
      </Link>
    </Button>
  );
}

export default async function SellRequestPage(props: PageProps<"/sell-requests/[id]">) {
  const { id } = await props.params;
  const request = await serverGetOrNull<SellRequest>(`/admin/sell-requests/${encodeURIComponent(id)}`);
  if (!request) {
    return (
      <>
        <Back />
        <Intro><T>There is no sell request at this address. Open it from the list.</T></Intro>
      </>
    );
  }

  // Each line: what it is, and its value (the words go through <T>; names, numbers and emails stay as they are).
  const piece: [string, string][] = [
    ["Piece", SELL_KIND[request.kind]],
    ["Brand", request.brand || "Another brand"],
    ["Karat", `${request.karat}K`],
    ["Weight", `${formatNumber(request.weightGrams)} g`],
    ["Quantity", String(request.qty)],
    ["Condition", SELL_CONDITION[request.condition]],
    ["Hand-over", SELL_HANDOVER[request.handover]],
    ["Payment", SELL_PAYOUT[request.payout]],
  ];
  const customer: [string, string][] = [
    ["Name", request.name],
    ["Mobile", request.mobile],
    ["Email", request.email],
    ["Account", request.userId ? `#${request.userId}` : "Guest"],
    ["Received", formatDateTime(request.createdAt)],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Back />
        <EditSellRequest request={request} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="num font-heading text-2xl">{request.reference}</h2>
        <Status tone={SELL_STATUS[request.status][1]}>{SELL_STATUS[request.status][0]}</Status>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle><T>The piece</T></CardTitle>
          </CardHeader>
          <CardContent>
            {piece.map(([label, value]) => (
              <div className={LINE} key={label}>
                <span className="text-sm text-muted-foreground"><T>{label}</T></span>
                <b className="num font-medium"><T>{value}</T></b>
              </div>
            ))}
            <div className={LINE}>
              <span className="text-sm text-muted-foreground"><T>Estimate (EGP)</T></span>
              <b className="num text-lg font-medium">{formatEgp(request.estimatePiastres)}</b>
            </div>
            <div className={LINE}>
              <span className="text-sm text-muted-foreground"><T>Sell price per gram (EGP)</T></span>
              <span className="num">{formatEgp(request.gramPiastres)}</span>
            </div>
            <div className={LINE}>
              <span className="text-sm text-muted-foreground"><T>Cashback per gram (EGP)</T></span>
              <span className="num">{formatEgp(request.cashbackGramPiastres)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle><T>The customer</T></CardTitle>
          </CardHeader>
          <CardContent>
            {customer.map(([label, value]) => (
              <div className={LINE} key={label}>
                <span className="text-sm text-muted-foreground"><T>{label}</T></span>
                <b className="num font-medium" dir="auto">{label === "Account" || label === "Received" ? <T>{value}</T> : value}</b>
              </div>
            ))}
            <div className="pt-3">
              <span className="text-sm text-muted-foreground"><T>Staff notes</T></span>
              <p className="mt-1 text-sm whitespace-pre-wrap" dir="auto">{request.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
