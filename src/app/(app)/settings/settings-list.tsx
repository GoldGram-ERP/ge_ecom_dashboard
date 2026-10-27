"use client";

import { InlineNumber } from "@/components/inline-number";
import { Note } from "@/components/parts";
import { T, useT } from "@/components/t";
import { Switch } from "@/components/switch";
import { toast } from "@/components/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moneyParseMessage, parseEgpToPiastres, piastresToInput } from "@/lib/money";
import type { Settings } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { usePermissions } from "@/lib/permissions";

type NumberKey = "tolerancePct" | "paidPeriodMinutes";
type MoneyKey = "sellCashbackSealedPiastres" | "sellCashbackOpenedPiastres";
type SwitchKey = Exclude<keyof Settings, NumberKey | MoneyKey>;
type Row =
  | { key: SwitchKey; kind: "switch"; label: string; hint: string }
  | { key: NumberKey; kind: "number"; label: string; hint: string; unit: string }
  | { key: MoneyKey; kind: "money"; label: string; hint: string; unit: string };

// The file's SET, with the setting names of SPEC section 3.7.
const GROUPS: [string, Row[]][] = [
  [
    "Trading",
    [
      { key: "marketOpen", kind: "switch", label: "Market status", hint: "Accept orders while the market is open" },
      { key: "storeClosed", kind: "switch", label: "Store closed", hint: "Close the whole store to customers" },
      { key: "tolerancePct", kind: "number", label: "Acceptance percentage", hint: "Price difference tolerated before admin review", unit: "%" },
      { key: "paidPeriodMinutes", kind: "number", label: "Allowed paid period", hint: "Unpaid orders are cancelled after this many", unit: "min" },
      { key: "branchPickup", kind: "switch", label: "Collect from our branch", hint: "Offer collection from the branch at checkout" },
    ],
  ],
  [
    "Compliance and catalog",
    [
      { key: "kycEnabled", kind: "switch", label: "KYC enabled", hint: "Customers must be verified before they transact" },
      { key: "requireKycDocPerOrder", kind: "switch", label: "KYC document on every order", hint: "Customers must upload an ID document before each order can be placed" },
      { key: "requireStock", kind: "switch", label: "Require stock", hint: "Block purchase when stock is empty" },
      { key: "showOutOfStockHome", kind: "switch", label: "Show out-of-stock on Home", hint: "" },
      { key: "showOutOfStockShop", kind: "switch", label: "Show out-of-stock in Shop", hint: "" },
    ],
  ],
  [
    "Customer display",
    [
      { key: "spreadVisible", kind: "switch", label: "Spread visibility", hint: "Show the buy–sell spread to customers" },
      { key: "deliveryDaysVisible", kind: "switch", label: "Delivery days visibility", hint: "Show estimated delivery days" },
    ],
  ],
  [
    "Buying gold from customers",
    [
      { key: "sellCashbackSealedPiastres", kind: "money", label: "Cashback, original packaging with the invoice", hint: "Per gram, for a piece of a brand we sell", unit: "EGP / g" },
      { key: "sellCashbackOpenedPiastres", kind: "money", label: "Cashback, packaging opened", hint: "Per gram, for a piece of a brand we sell", unit: "EGP / g" },
    ],
  ],
];

const LABELS = Object.fromEntries(GROUPS.flatMap(([, rows]) => rows.map((row) => [row.key, row.label])));

/** The cards of the file's V.settings, and the buy-back cashback. Each switch and field saves as it changes. */
export function SettingsList({ settings }: { settings: Settings }) {
  const t = useT();
  const { busy, send } = useSend();
  const { can } = usePermissions();

  return (
    <div className="grid max-w-3xl gap-5">
      {GROUPS.map(([title, rows]) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>{title}</T></CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-medium"><T>{row.label}</T></span>
                    {row.hint ? <Note><T>{row.hint}</T></Note> : null}
                  </div>
                  {row.kind === "switch" ? (
                    <Switch
                      on={settings[row.key]}
                      label={row.label}
                      locked={!can("settings:edit")}
                      onToggle={() => {
                        if (busy) return;
                        send("PATCH", "/admin/settings", { [row.key]: !settings[row.key] }, { labels: LABELS });
                      }}
                    />
                  ) : row.kind === "money" ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <InlineNumber
                        value={piastresToInput(settings[row.key])}
                        label={`${t(row.label)} (${t(row.unit)})`}
                        width={84}
                        onCommit={async (text) => {
                          const amount = parseEgpToPiastres(text);
                          if (!amount.ok) {
                            toast(moneyParseMessage(amount.reason));
                            return false;
                          }
                          return send("PATCH", "/admin/settings", { [row.key]: amount.piastres }, { labels: LABELS });
                        }}
                      />
                      <span className="text-xs text-muted-foreground"><T>{row.unit}</T></span>
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-2">
                      <InlineNumber
                        value={String(settings[row.key])}
                        label={`${t(row.label)} (${t(row.unit)})`}
                        width={84}
                        onCommit={async (text) => {
                          const value = Number(text);
                          if (text.trim() === "" || !Number.isFinite(value) || value < 0) {
                            toast("Enter a number, 0 or more");
                            return false;
                          }
                          return send("PATCH", "/admin/settings", { [row.key]: value }, { labels: LABELS });
                        }}
                      />
                      <span className="text-xs text-muted-foreground"><T>{row.unit}</T></span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
