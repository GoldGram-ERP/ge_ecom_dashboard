"use client";

import { InlineNumber } from "@/components/inline-number";
import { Note } from "@/components/parts";
import { T, useT } from "@/components/t";
import { Select } from "@/components/select";
import { Switch } from "@/components/switch";
import { toast } from "@/components/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Settings } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { usePermissions } from "@/lib/permissions";

type NumberKey = "tolerancePct" | "paidPeriodMinutes";
type TimeKey = "marketOpensAt" | "marketClosesAt";
type LinkKey = "whatsappUrl" | "iosUrl" | "androidUrl" | "instagramUrl" | "facebookUrl" | "tiktokUrl";
type SwitchKey = Exclude<keyof Settings, NumberKey | TimeKey | LinkKey | "marketOpen" | "marketEnforced">;

/** What the website can safely use: a full http(s) address, or a WhatsApp number as wa.me. */
function normalizeLink(key: LinkKey, text: string): string | undefined {
  const value = text.trim();
  if (!value) return "";
  if (key === "whatsappUrl" && !/[:/]/.test(value)) {
    const digits = value.replace(/\D/g, "");
    if (digits) return `https://wa.me/${digits}`;
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

type Row =
  | { key: SwitchKey; kind: "switch"; label: string; hint: string }
  | { key: NumberKey; kind: "number"; label: string; hint: string; unit: string }
  | { key: TimeKey; kind: "time"; label: string; hint: string }
  | { key: LinkKey; kind: "link"; label: string; hint: string }
  | { key: "marketOpen"; kind: "orders"; label: string; hint: string };

// One choice for customers, stored as the two settings the server checks.
type OrdersMode = "always" | "hours" | "paused";
const ordersMode = (settings: Settings): OrdersMode =>
  !settings.marketOpen ? "paused" : settings.marketEnforced ? "hours" : "always";
const ORDERS_PATCH: Record<OrdersMode, Partial<Settings>> = {
  always: { marketOpen: true, marketEnforced: false },
  hours: { marketOpen: true, marketEnforced: true },
  paused: { marketOpen: false },
};

// The file's SET, with the setting names of SPEC section 3.7.
const GROUPS: [string, Row[]][] = [
  [
    "Trading",
    [
      { key: "marketOpen", kind: "orders", label: "Orders", hint: "Paused stops all orders right away" },
      { key: "marketOpensAt", kind: "time", label: "Orders start at", hint: "Cairo time" },
      { key: "marketClosesAt", kind: "time", label: "Orders stop at", hint: "Cairo time" },
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
    "Website links",
    [
      { key: "whatsappUrl", kind: "link", label: "WhatsApp", hint: "A number or a full address; leave empty to hide the link" },
      { key: "instagramUrl", kind: "link", label: "Instagram", hint: "" },
      { key: "facebookUrl", kind: "link", label: "Facebook", hint: "" },
      { key: "tiktokUrl", kind: "link", label: "TikTok", hint: "" },
      { key: "iosUrl", kind: "link", label: "App Store", hint: "" },
      { key: "androidUrl", kind: "link", label: "Google Play", hint: "" },
    ],
  ],
];
// What GoldGram pays when buying gold back is set per product, in Cashback policies.

const LABELS = Object.fromEntries(GROUPS.flatMap(([, rows]) => rows.map((row) => [row.key, row.label])));

/** The cards of the file's V.settings. Each switch and field saves as it changes. */
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
              {rows.filter((row) => row.kind !== "time" || ordersMode(settings) === "hours").map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-medium"><T>{row.label}</T></span>
                    {row.hint ? <Note><T>{row.hint}</T></Note> : null}
                  </div>
                  {row.kind === "orders" ? (
                    <Select
                      aria-label={row.label}
                      value={ordersMode(settings)}
                      disabled={busy || !can("settings:edit")}
                      className="w-56 shrink-0"
                      onChange={(event) => {
                        send("PATCH", "/admin/settings", ORDERS_PATCH[event.target.value as OrdersMode], { labels: LABELS });
                      }}
                    >
                      <option value="always">Always open</option>
                      <option value="hours">Only during set hours</option>
                      <option value="paused">Paused</option>
                    </Select>
                  ) : row.kind === "switch" ? (
                    <Switch
                      on={settings[row.key]}
                      label={row.label}
                      locked={!can("settings:edit")}
                      onToggle={() => {
                        if (busy) return;
                        send("PATCH", "/admin/settings", { [row.key]: !settings[row.key] }, { labels: LABELS });
                      }}
                    />
                  ) : row.kind === "link" ? (
                    <Input
                      key={settings[row.key]}
                      type="url"
                      dir="ltr"
                      placeholder="https://"
                      defaultValue={settings[row.key]}
                      style={{ width: 320, maxWidth: "100%" }}
                      className="bg-card"
                      aria-label={t(row.label)}
                      disabled={!can("settings:edit")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      onBlur={async (event) => {
                        const input = event.currentTarget;
                        const saved = settings[row.key];
                        const value = normalizeLink(row.key, input.value);
                        if (value === undefined) {
                          toast("Enter a web address or a WhatsApp number");
                          input.value = saved;
                          return;
                        }
                        if (value === saved) return;
                        if (!(await send("PATCH", "/admin/settings", { [row.key]: value }, { labels: LABELS }))) input.value = saved;
                        else input.value = value;
                      }}
                    />
                  ) : row.kind === "time" ? (
                    <Input
                      key={settings[row.key]}
                      type="time"
                      dir="ltr"
                      defaultValue={settings[row.key]}
                      style={{ width: 120 }}
                      className="num bg-card"
                      aria-label={t(row.label)}
                      disabled={!can("settings:edit")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      onBlur={async (event) => {
                        const input = event.currentTarget;
                        const saved = settings[row.key];
                        if (input.value === saved) return;
                        const done = input.value !== "" && (await send("PATCH", "/admin/settings", { [row.key]: input.value }, { labels: LABELS }));
                        if (!done) input.value = saved;
                      }}
                    />
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
