"use client";

import { T, useT } from "@/components/t";
import { Dices } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { DateTextField, FormGrid, SelectField, TextField } from "@/components/parts";
import { Switch } from "@/components/switch";
import { toast } from "@/components/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cairoToday } from "@/lib/format";
import { parseEgpToPiastres, piastresToInput } from "@/lib/money";
import { rulePreview } from "@/lib/rule-preview";
import type { DiscountRule, Zone } from "@/lib/types";
import { useSend } from "@/lib/use-send";

const LABELS = {
  nameEn: "Name (EN)",
  nameAr: "الاسم (AR)",
  target: "Target",
  type: "Type",
  value: "Value",
  code: "Promo code",
  minCartPiastres: "Minimum cart (EGP)",
  validFrom: "Valid from",
  validTo: "Valid to",
  governorates: "Governorates",
};

/** A promo code to hand out: 8 letters and digits, without the ones that are easy to mistake (0/O, 1/I). */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

/** The file's V.newrule form, rpv() and addR(). Given a `rule`, it edits that rule instead. */
export function NewRuleForm({ rule, zones }: { rule?: DiscountRule; zones: Zone[] }) {
  const router = useRouter();
  const t = useT();
  const { busy, send } = useSend();
  const [nameEn, setNameEn] = useState(rule?.nameEn ?? "");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [nameAr, setNameAr] = useState(rule?.nameAr ?? "");
  const [target, setTarget] = useState<"labor" | "shipping">(rule?.target ?? "labor");
  const [type, setType] = useState<"percent" | "fixed">(rule?.type ?? "percent");
  // A fixed value is held in piastres and typed in EGP; a percentage is shown as stored.
  const [value, setValue] = useState(rule ? (rule.type === "fixed" ? piastresToInput(rule.value) : String(rule.value)) : "");
  const [code, setCode] = useState(rule && rule.code !== "AUTO" ? rule.code : "");
  const [minCart, setMinCart] = useState(rule ? piastresToInput(rule.minCartPiastres) : "0");
  const [validFrom, setValidFrom] = useState(rule?.validFrom.slice(0, 10) ?? "");
  const [validTo, setValidTo] = useState(rule?.validTo?.slice(0, 10) ?? "");
  // Limited to some governorates (the shipping zones), or everywhere when the switch is off.
  const [restrict, setRestrict] = useState(Boolean(rule?.governorates?.length));
  const [chosen, setChosen] = useState<string[]>(rule?.governorates ?? []);
  const places = zones.filter((zone) => zone.governorate && (zone.active || chosen.includes(zone.governorate)));
  const toggleZone = (key: string, on: boolean) => setChosen((prev) => (on ? [...prev, key] : prev.filter((item) => item !== key)));

  async function create() {
    const amount = Number(value);
    if (!nameEn.trim() || !(amount > 0) || !validFrom) {
      toast("Add a name, a value and a start date");
      return;
    }
    if (type === "percent" && amount > 100) {
      toast("A percentage cannot exceed 100");
      return;
    }
    if (restrict && chosen.length === 0) {
      toast("Choose at least one governorate");
      return;
    }
    if (validTo && validTo < validFrom) {
      toast("The end date is before the start date");
      return;
    }
    // Typed EGP become integer piastres; a percentage is sent as typed.
    const fixed = parseEgpToPiastres(value);
    const minimum = parseEgpToPiastres(minCart.trim() === "" ? "0" : minCart);
    if ((type === "fixed" && !fixed.ok) || !minimum.ok) {
      toast("Use at most 2 decimal places for EGP amounts");
      return;
    }
    // Switching a rule on or off is its own request; the rewrite below keeps whatever it finds.
    if (rule && enabled !== rule.enabled && !(await send("PATCH", `/admin/discount-rules/${rule.id}`, { enabled }))) return;
    const created = await send(
      rule ? "PUT" : "POST",
      rule ? `/admin/discount-rules/${rule.id}` : "/admin/discount-rules",
      {
        nameEn: nameEn.trim(),
        ...(nameAr.trim() ? { nameAr: nameAr.trim() } : {}),
        target,
        type,
        value: type === "fixed" && fixed.ok ? fixed.piastres : amount,
        ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
        minCartPiastres: minimum.piastres,
        validFrom,
        ...(validTo ? { validTo } : {}),
        // Left out, the rule applies to every governorate.
        ...(restrict ? { governorates: chosen } : {}),
      },
      { done: rule ? "Rule saved" : "Rule created", labels: LABELS },
    );
    if (created) router.push("/discount-rules");
  }

  return (
    <>
      <FormGrid>
        <TextField id="rn" label="Name (EN)" value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
        <TextField id="ra" label="الاسم (AR)" dir="rtl" value={nameAr} onChange={(event) => setNameAr(event.target.value)} />
        <SelectField
          id="rt"
          label="Target"
          value={target}
          onChange={(event) => setTarget(event.target.value === "shipping" ? "shipping" : "labor")}
        >
          <option value="labor">Labor</option>
          <option value="shipping">Shipping</option>
        </SelectField>
        <SelectField
          id="ry"
          label="Type"
          value={type}
          onChange={(event) => setType(event.target.value === "fixed" ? "fixed" : "percent")}
        >
          <option value="percent">%</option>
          <option value="fixed">EGP</option>
        </SelectField>
        <TextField
          id="rv"
          label="Value"
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {rule ? (
          <SelectField id="re" label="Rule is" value={enabled ? "1" : "0"} onChange={(event) => setEnabled(event.target.value === "1")}>
            <option value="1">On</option>
            <option value="0">Off</option>
          </SelectField>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor="rc"><T>Promo code (blank = Auto)</T></Label>
          <div className="relative">
            <Input id="rc" className="bg-card pe-11" dir="ltr" value={code} onChange={(event) => setCode(event.target.value)} />
            <button
              type="button"
              className="absolute inset-y-0 end-1.5 my-auto grid size-8 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("Generate a code")}
              title={t("Generate a code")}
              onClick={() => setCode(generateCode())}
            >
              <Dices aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
        <TextField
          id="rm"
          label="Minimum cart (EGP)"
          type="number"
          min="0"
          step="any"
          value={minCart}
          onChange={(event) => setMinCart(event.target.value)}
        />
        <DateTextField
          id="rf"
          label="Valid from"
          value={validFrom}
          onChange={(event) => setValidFrom(event.target.value)}
        />
        <DateTextField
          id="rto"
          label="Valid to (optional)"
          value={validTo}
          onChange={(event) => setValidTo(event.target.value)}
        />
      </FormGrid>
      <div className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <b className="font-medium"><T>Restrict to specific locations</T></b>
            <p className="text-sm text-muted-foreground"><T>Limit this discount to the selected governorates. Leave off to apply everywhere.</T></p>
          </div>
          <Switch on={restrict} label="Restrict to specific locations" onToggle={() => setRestrict((on) => !on)} />
        </div>
        {restrict ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase"><T>Governorates</T></span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="num">{chosen.length}</span> <T>selected</T>
                <Button type="button" variant="ghost" size="sm" onClick={() => setChosen(places.map((zone) => zone.governorate ?? ""))}>
                  <T>Select all</T>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setChosen([])}>
                  <T>Clear</T>
                </Button>
              </span>
            </div>
            <div className="max-h-72 divide-y overflow-y-auto rounded-lg border">
              {places.map((zone) => {
                const key = zone.governorate ?? "";
                return (
                  <label key={zone.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/60">
                    <Checkbox checked={chosen.includes(key)} onCheckedChange={(on) => toggleZone(key, on === true)} />
                    <span className="font-medium">{zone.nameEn}</span>
                    <span className="ms-auto text-muted-foreground" dir="rtl">{zone.nameAr}</span>
                  </label>
                );
              })}
            </div>
            {places.length === 0 ? <p className="text-sm text-muted-foreground"><T>No shipping zones yet. Add them on the Geography page.</T></p> : null}
          </div>
        ) : null}
      </div>
      <div className="rounded-lg bg-accent px-4 py-3 text-sm ring-1 ring-gold/40" id="rpv" aria-live="polite">
        <T>{rulePreview({ target, type, value: Number(value), validFrom, validTo }, cairoToday())}</T>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="gold" disabled={busy} onClick={create}>
          <T>{rule ? "Save rule" : "Create rule"}</T>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/discount-rules"><T>Cancel</T></Link>
        </Button>
      </div>
    </>
  );
}
