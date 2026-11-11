"use client";

import { Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { isRowClick } from "@/components/link-row";
import { Modal } from "@/components/modal";
import { Status, TableCard, TextField } from "@/components/parts";
import { RichTextEditor } from "@/components/rich-text";
import { T } from "@/components/t";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatStamp } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import { type PageBody, type PageKey, SEO_API } from "@/lib/seo-api";
import { publicPath } from "@/lib/seo-rules";
import { useSend } from "@/lib/use-send";

const NAMES: Record<PageKey, string> = {
  about: "About",
  contact: "Contact",
  app: "App page",
  "policies-shipping": "Shipping policy",
  "policies-buyback": "Buyback policy",
};
const LABELS = { title: "Title", bodyHtml: "Text" };

/** The editable page bodies. A row opens the page; its text changes only after Edit. */
export function PageBodies({ pages }: { pages: PageBody[] }) {
  const { can } = usePermissions();
  const { busy, send } = useSend();
  const [open, setOpen] = useState<{ key: PageKey; edit: boolean } | null>(null);
  const page = open ? pages.find((p) => p.key === open.key) : undefined;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!page) return;
    const form = new FormData(event.currentTarget);
    const en = String(form.get("titleEn") ?? "").trim();
    const ar = String(form.get("titleAr") ?? "").trim();
    if (!en || !ar) return toast("Give the page a title in both languages");
    const body = { title: { en, ar }, bodyHtml: { en: String(form.get("bodyEn") ?? ""), ar: String(form.get("bodyAr") ?? "") } };
    if (await send("PUT", SEO_API.page(page.key), body, { done: "Page saved", labels: LABELS })) setOpen(null);
  }

  return (
    <>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Page</T></TableHead>
              <TableHead scope="col"><T>Address</T></TableHead>
              <TableHead scope="col"><T>Title (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Updated</T></TableHead>
              <TableHead scope="col"><span className="sr-only"><T>Actions</T></span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((p) => (
              <TableRow key={p.key} className="cursor-pointer" onClick={(event) => isRowClick(event) && setOpen({ key: p.key, edit: false })}>
                <TableCell className="font-medium"><T>{NAMES[p.key]}</T></TableCell>
                <TableCell dir="ltr" className="text-start text-muted-foreground">{publicPath("static", p.key)}</TableCell>
                <TableCell className="whitespace-normal">
                  {p.title.en || <Status tone="mute">Not written</Status>}
                  {p.title.ar ? <small dir="rtl" className="block text-xs text-muted-foreground">{p.title.ar}</small> : null}
                </TableCell>
                <TableCell className="text-muted-foreground"><T>{formatStamp(p.updatedAt)}</T></TableCell>
                <TableCell className="text-end">
                  {can("seo:edit") ? (
                    <Button type="button" variant="outline" size="sm" aria-label={`Edit ${NAMES[p.key]}`} onClick={() => setOpen({ key: p.key, edit: true })}>
                      <Pencil aria-hidden="true" />
                      <T>Edit</T>
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      {open && page ? (
        <Modal
          wide
          title={NAMES[page.key]}
          onClose={() => setOpen(null)}
          actions={
            !open.edit && can("seo:edit") ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen({ ...open, edit: true })}>
                <Pencil aria-hidden="true" />
                <T>Edit</T>
              </Button>
            ) : undefined
          }
        >
          {open.edit ? (
            <form key={page.key} className="grid gap-4" onSubmit={save} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Title (EN)" name="titleEn" defaultValue={page.title.en} />
                <TextField label="العنوان (AR)" name="titleAr" dir="rtl" defaultValue={page.title.ar} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <RichTextEditor label="Content (English)" name="bodyEn" value={page.bodyHtml.en} />
                <RichTextEditor label="Content (Arabic)" name="bodyAr" value={page.bodyHtml.ar} dir="rtl" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="gold" disabled={busy}><T>Save page</T></Button>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}><T>Cancel</T></Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["en", "ar"] as const).map((l) => (
                <article key={l} dir={l === "ar" ? "rtl" : "ltr"} className="grid content-start gap-2 rounded-lg bg-muted/60 p-3">
                  <h3 className="font-heading text-base">{page.title[l] || "—"}</h3>
                  {/* Plain text here: the page itself is drawn by the website, from the sanitized HTML. */}
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{page.bodyHtml[l].replace(/<\/(p|h2|h3|li)>/g, "\n").replace(/<[^>]+>/g, "").trim() || "—"}</p>
                </article>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}
