"use client";

import { T } from "@/components/t";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { DateTextField, FormGrid, SelectField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { cairoToday } from "@/lib/format";
import { parseEgpToPiastres, piastresToInput } from "@/lib/money";
import { rulePreview } from "@/lib/rule-preview";
import type { DiscountRule } from "@/lib/types";
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
};

/** The file's V.newrule form, rpv() and addR(). Given a `rule`, it edits that rule instead. */
export function NewRuleForm({ rule }: { rule?: DiscountRule }) {
  const router = useRouter();
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
        <TextField id="rc" label="Promo code (blank = Auto)" value={code} onChange={(event) => setCode(event.target.value)} />
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
