"use client";

import { T } from "@/components/t";
import { Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Modal } from "@/components/modal";
import { FormGrid, Note, OnOffField, Status, TableCard, TextAreaField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEgp, moneyParseMessage, parseEgpToPiastres, piastresToInput } from "@/lib/money";
import type { PaymentMethod } from "@/lib/types";
import { useSend } from "@/lib/use-send";

const LABELS = {
  fixedFeePiastres: "Fixed fee (EGP)",
  percentFee: "Percentage fee (%)",
  proofRequired: "Proof required",
  active: "Status",
  nameEn: "Name (EN)",
  nameAr: "الاسم (AR)",
  description: "Description",
  window: "Window",
  payTo: "Pay to",
};

/** The table of the file's V.pay: names, two fees, proof and status per method. All of it changes in the row's "Edit" dialog. */
export function MethodsTable({ methods, ar }: { methods: PaymentMethod[]; ar: boolean }) {
  const { busy, send } = useSend();
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("nameEn") || !text("nameAr") || !text("window")) {
      toast("Give the method both names and a window");
      return;
    }
    const fee = parseEgpToPiastres(text("fixedFee"));
    if (!fee.ok) {
      toast(`Fixed fee: ${moneyParseMessage(fee.reason)}`);
      return;
    }
    const percentFee = Number(text("percentFee"));
    if (text("percentFee") === "" || !Number.isFinite(percentFee) || percentFee < 0) {
      toast("Enter a percentage, 0 or more");
      return;
    }
    const saved = await send(
      "PATCH",
      `/admin/payment-methods/${editing.id}`,
      { nameEn: text("nameEn"), nameAr: text("nameAr"), description: text("description"), window: text("window"), payTo: text("payTo"), fixedFeePiastres: fee.piastres, percentFee, proofRequired: text("proofRequired") === "1", active: text("active") === "1" },
      { done: "Method saved", labels: LABELS },
    );
    if (saved) setEditing(null);
  }

  return (
    <TableCard>
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Method (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Type</T></TableHead>
              {/* Short headings and a wrapping description keep "Edit" on screen without scrolling sideways. */}
              <TableHead scope="col" className="text-end">
                <T>Fee (EGP)</T>
              </TableHead>
              <TableHead scope="col" className="text-end">
                <T>Fee (%)</T>
              </TableHead>
              <TableHead scope="col"><T>Proof required</T></TableHead>
              <TableHead scope="col"><T>Window</T></TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
              <TableHead scope="col">
                <span className="sr-only"><T>Actions</T></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>
                  <b className="font-medium">{ar ? method.nameAr : method.nameEn}</b>
                  <Note>{ar ? method.nameEn : method.nameAr}</Note>
                  {method.description ? <Note className="max-w-52 whitespace-normal">{method.description}</Note> : null}
                  {method.payTo ? <Note className="max-w-52 whitespace-pre-line">{method.payTo}</Note> : <Note><T>No account details yet</T></Note>}
                </TableCell>
                <TableCell><T>Direct (manual proof)</T></TableCell>
                <TableCell className="num text-end">{formatEgp(method.fixedFeePiastres)}</TableCell>
                <TableCell className="num text-end">{method.percentFee}</TableCell>
                <TableCell><T>{method.proofRequired ? "Required" : "Not required"}</T></TableCell>
                <TableCell className="text-muted-foreground">{method.window}</TableCell>
                <TableCell>
                  <Status tone={method.active ? "ok" : "mute"}><T>{method.active ? "Active" : "Inactive"}</T></Status>
                </TableCell>
                <TableCell className="text-end">
                  <Button type="button" variant="outline" className="bg-card" disabled={busy} onClick={() => setEditing(method)}>
                    <Pencil aria-hidden="true" />
                    <T>Edit</T>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
      </Table>
      {editing ? (
        <Modal title={`Edit ${editing.nameEn}`} description="Customers see the names at checkout." onClose={() => setEditing(null)}>
          <form className="grid gap-4" onSubmit={save} noValidate>
            <FormGrid className="lg:grid-cols-2">
              <TextField label="Name (EN)" name="nameEn" defaultValue={editing.nameEn} />
              <TextField label="الاسم (AR)" name="nameAr" dir="rtl" defaultValue={editing.nameAr} />
              <TextField label="Description" name="description" defaultValue={editing.description ?? ""} />
              <TextField label="Window" name="window" defaultValue={editing.window} />
              <TextField label="Fixed fee (EGP)" name="fixedFee" defaultValue={piastresToInput(editing.fixedFeePiastres)} type="number" min="0" step="any" />
              <TextField label="Percentage fee (%)" name="percentFee" defaultValue={editing.percentFee} type="number" min="0" step="any" />
              <OnOffField on={editing.proofRequired} label="Proof of payment" name="proofRequired" yes="Required" no="Not required" />
              <OnOffField on={editing.active} />
            </FormGrid>
            {/* One line each: the bank, the account name, the IBAN (or the InstaPay address). */}
            <TextAreaField
              label="Pay to (shown to the customer after ordering and in the emails)"
              name="payTo"
              rows={4}
              maxLength={500}
              placeholder={["Bank name", "Account name", "IBAN EG00 0000 0000 0000 0000 0000 000"].join("\n")}
              defaultValue={editing.payTo ?? ""}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy}>
                <T>Save method</T>
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                <T>Cancel</T>
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </TableCard>
  );
}
