"use client";

import { Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { isRowClick } from "@/components/link-row";
import { Modal } from "@/components/modal";
import { Note, TableCard, TextAreaField, TextField } from "@/components/parts";
import { T, useT } from "@/components/t";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/lib/permissions";
import { LANGS, PAGE_TYPES, type PageType, SEO_API, TEMPLATE_VARIABLES, type Templates } from "@/lib/seo-api";
import { LANG_NAME, unknownVariables } from "@/lib/seo-rules";
import { useSend } from "@/lib/use-send";

export const PAGE_TYPE_NAME: Record<PageType, string> = {
  home: "Home",
  static: "Static pages",
  category: "Categories",
  weight: "Weight pages",
  product: "Products",
  brand: "Brands",
  guide: "Guide articles",
  guides: "Guides listing",
  price: "Price pages",
  faq: "FAQ",
};

/** The templates, one row per page type. A row opens its patterns; they change only after Edit. */
export function TemplatesTable({ templates }: { templates: Templates }) {
  const t = useT();
  const { can } = usePermissions();
  const { busy, send } = useSend();
  const [open, setOpen] = useState<{ type: PageType; edit: boolean } | null>(null);
  const empty = { title: "", description: "" };
  const of = (type: PageType) => templates[type] ?? { en: empty, ar: empty };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!open) return;
    const form = new FormData(event.currentTarget);
    // One line each: a line break would end up inside the <title>.
    const line = (l: string, field: string) => String(form.get(`${l}.${field}`) ?? "").replace(/\s+/g, " ").trim();
    const next = Object.fromEntries(LANGS.map((l) => [l, Object.fromEntries((["title", "description"] as const).map((field) => [field, line(l, field)]))])) as Templates[PageType];
    const unknown = LANGS.flatMap((l) => [...unknownVariables(next[l].title, TEMPLATE_VARIABLES), ...unknownVariables(next[l].description, TEMPLATE_VARIABLES)]);
    if (unknown.length > 0) {
      toast(`Unknown variables: ${[...new Set(unknown)].join(", ")}`);
      return;
    }
    if (await send("PUT", SEO_API.templates, { ...templates, [open.type]: next }, { done: "Template saved" })) setOpen(null);
  }

  const opened = open ? of(open.type) : null;

  return (
    <>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Page type</T></TableHead>
              <TableHead scope="col"><T>Title (English)</T></TableHead>
              <TableHead scope="col"><T>Title (Arabic)</T></TableHead>
              <TableHead scope="col"><span className="sr-only"><T>Actions</T></span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAGE_TYPES.map((type) => (
              <TableRow key={type} className="cursor-pointer" onClick={(event) => isRowClick(event) && setOpen({ type, edit: false })}>
                <TableCell className="font-medium"><T>{PAGE_TYPE_NAME[type]}</T></TableCell>
                <TableCell className="max-w-80 truncate text-muted-foreground">{of(type).en.title || "—"}</TableCell>
                <TableCell dir="rtl" className="max-w-80 truncate text-muted-foreground">{of(type).ar.title || "—"}</TableCell>
                <TableCell className="text-end">
                  {can("seo:edit") ? (
                    <Button type="button" variant="outline" size="sm" aria-label={`Edit ${PAGE_TYPE_NAME[type]}`} onClick={() => setOpen({ type, edit: true })}>
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
      <Note>Variables: {TEMPLATE_VARIABLES.join(" ")}</Note>
      {open && opened ? (
        <Modal
          wide
          title={PAGE_TYPE_NAME[open.type]}
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
            <form key={open.type} className="grid gap-4" onSubmit={save} noValidate>
              {LANGS.map((l) => (
                <div key={l} className="grid gap-3">
                  <TextField label={`${t("Title pattern")} (${t(LANG_NAME[l])})`} name={`${l}.title`} dir={l === "ar" ? "rtl" : "ltr"} defaultValue={opened[l].title} />
                  <TextAreaField label={`${t("Description pattern")} (${t(LANG_NAME[l])})`} name={`${l}.description`} dir={l === "ar" ? "rtl" : "ltr"} defaultValue={opened[l].description} />
                </div>
              ))}
              <Note>Variables: {TEMPLATE_VARIABLES.join(" ")}</Note>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="gold" disabled={busy}><T>Save template</T></Button>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}><T>Cancel</T></Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-2">
              {LANGS.flatMap((l) =>
                (["title", "description"] as const).map((field) => (
                  <div key={`${l}-${field}`} className="rounded-lg bg-muted/60 px-3 py-2.5">
                    <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      <T>{field === "title" ? "Title pattern" : "Description pattern"}</T> (<T>{LANG_NAME[l]}</T>)
                    </dt>
                    <dd dir={l === "ar" ? "rtl" : "ltr"} className="mt-0.5 [overflow-wrap:anywhere]">{opened[l][field] || "—"}</dd>
                  </div>
                )),
              )}
            </dl>
          )}
        </Modal>
      ) : null}
    </>
  );
}
