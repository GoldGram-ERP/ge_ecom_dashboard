import { T } from "@/components/t";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Intro, Status } from "@/components/parts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverGetOrNull } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { LOG_SOURCES } from "@/lib/labels";
import type { LogEntry } from "@/lib/types";

function BackToLogs() {
  return (
    <Button variant="outline" size="sm" className="w-fit" asChild>
      <Link href="/logs">
        <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
        <T>Back to the system logs</T>
      </Link>
    </Button>
  );
}

// One line of the system log: the facts beside what was recorded.
export default async function LogEntryPage(props: PageProps<"/logs/[source]/[id]">) {
  const { source, id } = await props.params;
  const entry = await serverGetOrNull<LogEntry>(`/admin/logs/${encodeURIComponent(source)}/${encodeURIComponent(id)}`);

  if (!entry) {
    return (
      <>
        <BackToLogs />
        <Intro><T>There is no log entry at this address. Open it from the system logs.</T></Intro>
      </>
    );
  }

  const [label, tone] = LOG_SOURCES[entry.source] ?? [entry.source, "mute"];

  return (
    <>
      <BackToLogs />
      <div className="flex flex-wrap items-center gap-3">
        <h2 dir="auto" className="text-2xl [overflow-wrap:anywhere]">
          <T>{entry.summary}</T>
        </h2>
        <Status tone={tone}>{label}</Status>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Entry</T></CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {[
                ["Date", formatDateTime(entry.createdAt)],
                ["By", entry.actor],
              ].map(([name, value]) => (
                <div className="py-2.5 first:pt-0 last:pb-0" key={name}>
                  <dt className="text-xs text-muted-foreground"><T>{name}</T></dt>
                  <dd className="[overflow-wrap:anywhere]"><T>{value}</T></dd>
                </div>
              ))}
              {entry.orderId !== null ? (
                <div className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
                  <div>
                    <dt className="text-xs text-muted-foreground"><T>Order</T></dt>
                    <dd className="num">#{entry.orderId}</dd>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/orders/${entry.orderId}`}><T>Open the order</T></Link>
                  </Button>
                </div>
              ) : null}
              {entry.customerId !== null ? (
                <div className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
                  <div>
                    <dt className="text-xs text-muted-foreground"><T>Customer</T></dt>
                    <dd className="num">#{entry.customerId}</dd>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/customers/${entry.customerId}`}><T>Open the customer</T></Link>
                  </Button>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Details</T></CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {entry.details.map((line) => (
                <div className="py-2.5 first:pt-0 last:pb-0" key={line.label}>
                  <dt className="text-xs text-muted-foreground"><T>{line.label}</T></dt>
                  {/* Shown as written; dir="auto" lets an Arabic message read right to left. */}
                  <dd dir="auto" className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
                    <T>{line.value}</T>
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
