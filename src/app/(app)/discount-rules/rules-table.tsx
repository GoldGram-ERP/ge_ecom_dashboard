"use client";

import { T } from "@/components/t";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Confirm } from "@/components/modal";
import { EmptyRow, Note, Status, TableCard } from "@/components/parts";
import { RowAction, RowActions, RowActionsSeparator } from "@/components/row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { formatEgp } from "@/lib/money";
import type { DiscountRule } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { usePermissions } from "@/lib/permissions";

/** The table of the file's V.rules, with its on/off switch and delRule(). */
export function RulesTable({ rules, ar }: { rules: DiscountRule[]; ar: boolean }) {
  const { busy, send } = useSend();
  const { can } = usePermissions();
  const [deleting, setDeleting] = useState<DiscountRule | null>(null);

  return (
    <TableCard>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col"><T>Rule</T></TableHead>
            <TableHead scope="col"><T>Target</T></TableHead>
            <TableHead scope="col" className="text-end">
              <T>Value</T>
            </TableHead>
            <TableHead scope="col"><T>Promo code</T></TableHead>
            <TableHead scope="col" className="text-end">
              <T>Min cart</T>
            </TableHead>
            <TableHead scope="col"><T>Valid</T></TableHead>
            <TableHead scope="col"><T>Status</T></TableHead>
            <TableHead scope="col">
              <span className="sr-only"><T>Actions</T></span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.length === 0 ? (
            <EmptyRow colSpan={8}><T>No rules match this filter.</T></EmptyRow>
          ) : (
            rules.map((rule) => {
              const nameAr = rule.nameAr || rule.nameEn;
              return (
                <TableRow key={rule.id}>
                  <TableCell>
                    <b className="font-medium">{ar ? nameAr : rule.nameEn}</b>
                    <Note>{ar ? rule.nameEn : nameAr}</Note>
                    {rule.governorates?.length ? (
                      <Note>
                        {rule.governorates.length} <T>governorates only</T>
                      </Note>
                    ) : null}
                  </TableCell>
                  <TableCell><T>{rule.target === "labor" ? "Labor" : "Shipping"}</T></TableCell>
                  <TableCell className="num text-end">
                    <T>{rule.type === "percent" ? `${formatNumber(rule.value)}%` : `${formatEgp(rule.value)} EGP`}</T>
                  </TableCell>
                  <TableCell><T>{rule.code === "AUTO" ? "Auto" : rule.code}</T></TableCell>
                  <TableCell className="num text-end">{formatEgp(rule.minCartPiastres)}</TableCell>
                  <TableCell className="num text-muted-foreground">
                    {rule.validFrom.slice(0, 10)} → <T>{rule.validTo ? rule.validTo.slice(0, 10) : "open"}</T>
                  </TableCell>
                  <TableCell>
                    <Status tone={rule.status === "Active" ? "ok" : rule.status === "Scheduled" ? "info" : "mute"}>
                      {rule.status}
                    </Status>
                  </TableCell>
                  <TableCell className="text-end">
                    <RowActions label={`Actions for ${rule.nameEn}`}>
                      <RowAction label="Edit" need="discount_rules:edit" icon={<Pencil aria-hidden="true" />} href={`/discount-rules/${rule.id}`} />
                      <RowActionsSeparator />
                      <RowAction label="Delete" need="discount_rules:delete" icon={<Trash2 aria-hidden="true" />} danger disabled={busy} onSelect={() => setDeleting(rule)} />
                    </RowActions>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {deleting ? (
        <Confirm
          question={`Delete the rule ${(ar && deleting.nameAr) || deleting.nameEn}?`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/discount-rules/${deleting.id}`, undefined, { done: "Rule deleted" });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </TableCard>
  );
}
