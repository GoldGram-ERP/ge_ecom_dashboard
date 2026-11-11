"use client";

import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { isRowClick } from "@/components/link-row";
import { Confirm, Modal } from "@/components/modal";
import { EmptyRow, FormGrid, Note, SelectField, Status, TableCard, TextField } from "@/components/parts";
import { T, useT } from "@/components/t";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api";
import { formatNumber, formatStamp } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import { type RedirectInput, type RedirectRule, type RedirectType, SEO_API } from "@/lib/seo-api";
import { redirectEffect, redirectProblem } from "@/lib/seo-rules";
import { useSend } from "@/lib/use-send";

const LABELS = { from: "Old path", to: "New address", type: "Type", note: "Note" };
// The server refuses a loop; its own sentence is shown for any other refusal.
const REFUSALS = { REDIRECT_LOOP: "This rule would send visitors in a loop. Pick another address." };

/** The redirect rules. A row opens its rule; it changes only after Edit. */
export function Redirects({ rules }: { rules: RedirectRule[] }) {
  const t = useT();
  const router = useRouter();
  const { can } = usePermissions();
  const { busy, send } = useSend();
  const [open, setOpen] = useState<{ id: number | "new"; edit: boolean } | null>(null);
  const [deleting, setDeleting] = useState<RedirectRule | null>(null);
  const [draft, setDraft] = useState<RedirectInput>({ from: "", to: "", type: 301, note: "" });
  const [importing, setImporting] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const opened = open && open.id !== "new" ? (rules.find((rule) => rule.id === open.id) ?? null) : null;
  const others = rules.filter((rule) => rule.id !== opened?.id);
  const effect = open?.edit ? redirectEffect(draft, others) : null;

  function edit(rule: RedirectRule | null) {
    setDraft(rule ? { from: rule.from, to: rule.to, type: rule.type, note: rule.note } : { from: "", to: "", type: 301, note: "" });
    setOpen({ id: rule?.id ?? "new", edit: true });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rule = { ...draft, from: draft.from.trim(), to: draft.type === 410 ? "" : draft.to.trim(), note: draft.note.trim() };
    const problem = redirectProblem(rule);
    if (problem) return toast(problem);
    if (redirectEffect(rule, others)?.kind === "loop") return toast(REFUSALS.REDIRECT_LOOP);
    const done = opened
      ? await send("PATCH", SEO_API.redirect(opened.id), rule, { done: "Redirect saved", labels: LABELS, refusals: REFUSALS })
      : await send("POST", SEO_API.redirects, rule, { done: "Redirect added", labels: LABELS, refusals: REFUSALS });
    if (done) setOpen(null);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      await api(SEO_API.redirectsImport, { method: "POST", body: { csv: await file.text() } });
      toast("Redirects imported");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error, LABELS));
    }
    setImporting(false);
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild>
          <a href={`/api${SEO_API.redirectsCsv}`} download="redirects.csv">
            <Download aria-hidden="true" />
            <T>Export CSV</T>
          </a>
        </Button>
        {can("seo:edit") ? (
          <>
            <input ref={picker} type="file" accept=".csv,text/csv" hidden tabIndex={-1} aria-hidden="true" onChange={importCsv} />
            <Button type="button" variant="outline" disabled={importing} onClick={() => picker.current?.click()}>
              <Upload aria-hidden="true" />
              <T>{importing ? "Importing…" : "Import CSV"}</T>
            </Button>
            <Button type="button" variant="gold" onClick={() => edit(null)}>
              <Plus aria-hidden="true" />
              <T>New redirect</T>
            </Button>
          </>
        ) : null}
      </div>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Old path</T></TableHead>
              <TableHead scope="col"><T>New address</T></TableHead>
              <TableHead scope="col"><T>Type</T></TableHead>
              <TableHead scope="col"><T>Note</T></TableHead>
              <TableHead scope="col"><T>Created</T></TableHead>
              <TableHead scope="col" className="text-end"><T>Hits</T></TableHead>
              <TableHead scope="col"><T>Last hit</T></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <EmptyRow colSpan={7}>No redirects yet.</EmptyRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id} className="cursor-pointer" onClick={(event) => isRowClick(event) && setOpen({ id: rule.id, edit: false })}>
                  <TableCell dir="ltr" className="text-start">
                    <Button type="button" variant="link" className="h-auto p-0 font-medium text-foreground" aria-label={`Open ${rule.from}`} onClick={() => setOpen({ id: rule.id, edit: false })}>
                      {rule.from}
                    </Button>
                  </TableCell>
                  <TableCell dir="ltr" className="max-w-72 truncate text-start text-muted-foreground">{rule.type === 410 ? "—" : rule.to}</TableCell>
                  <TableCell><Status tone={rule.type === 410 ? "warn" : "info"}>{String(rule.type)}</Status></TableCell>
                  <TableCell className="max-w-56 truncate">{rule.note}</TableCell>
                  <TableCell>
                    <T>{formatStamp(rule.createdAt)}</T>
                    <Note>{rule.createdBy}</Note>
                  </TableCell>
                  <TableCell className="num text-end">{formatNumber(rule.hits)}</TableCell>
                  <TableCell className="text-muted-foreground"><T>{formatStamp(rule.lastHitAt)}</T></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
      <Note>CSV columns: from, to, type, note.</Note>
      {open ? (
        <Modal
          title={open.id === "new" ? "New redirect" : "Redirect"}
          onClose={() => setOpen(null)}
          actions={
            opened && !open.edit && can("seo:edit") ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => edit(opened)}>
                  <Pencil aria-hidden="true" />
                  <T>Edit</T>
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => setDeleting(opened)}>
                  <Trash2 aria-hidden="true" />
                  <T>Delete</T>
                </Button>
              </>
            ) : undefined
          }
        >
          {open.edit ? (
            <form className="grid gap-4" onSubmit={save} noValidate>
              <FormGrid className="lg:grid-cols-2">
                <TextField label="Old path" dir="ltr" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
                <SelectField label="Type" value={String(draft.type)} onChange={(event) => setDraft({ ...draft, type: Number(event.target.value) as RedirectType })}>
                  <option value="301">301 moved</option>
                  <option value="302">302 for now</option>
                  <option value="410">410 gone</option>
                </SelectField>
                {draft.type === 410 ? null : (
                  <TextField label="New address" dir="ltr" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
                )}
                <TextField label="Note" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
              </FormGrid>
              {effect?.kind === "loop" ? <p className="text-sm text-destructive"><T>{REFUSALS.REDIRECT_LOOP}</T></p> : null}
              {effect?.kind === "chain" ? (
                <p className="text-sm text-warning">
                  <T>The new address is itself redirected to</T> <span dir="ltr">{effect.via}</span>
                  <T>. Visitors go straight to the final address, and older rules are updated to it.</T>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="gold" disabled={busy}><T>Save redirect</T></Button>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}><T>Cancel</T></Button>
              </div>
            </form>
          ) : opened ? (
            <dl className="grid grid-cols-2 gap-2">
              {(
                [
                  ["Old path", <span dir="ltr" key="v">{opened.from}</span>],
                  ["Type", String(opened.type)],
                  ["New address", <span dir="ltr" key="v">{opened.type === 410 ? "—" : opened.to}</span>],
                  ["Note", opened.note || "—"],
                  ["Created by", opened.createdBy || "—"],
                  ["Created", t(formatStamp(opened.createdAt))],
                  ["Hits", formatNumber(opened.hits)],
                  ["Last hit", t(formatStamp(opened.lastHitAt))],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg bg-muted/60 px-3 py-2.5">
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"><T>{label}</T></dt>
                  <dd className="mt-0.5 [overflow-wrap:anywhere]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Modal>
      ) : null}
      {deleting ? (
        <Confirm
          question={`Delete the redirect from ${deleting.from}?`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            if (await send("DELETE", SEO_API.redirect(deleting.id), undefined, { done: "Redirect deleted" })) setOpen(null);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
