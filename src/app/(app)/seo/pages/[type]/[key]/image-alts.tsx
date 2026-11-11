"use client";

import Image from "next/image";
import { Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { Modal } from "@/components/modal";
import { Note, Status, TextField } from "@/components/parts";
import { T } from "@/components/t";
import { toast } from "@/components/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/lib/permissions";
import { type ImageAlt, type PublicProduct, SEO_API } from "@/lib/seo-api";
import { altProblem } from "@/lib/seo-rules";
import { useSend } from "@/lib/use-send";

/** MED-01: alt text per product photo and language, or "decorative". The SEO team edits it without products:edit. */
export function ImageAlts({ product }: { product: PublicProduct }) {
  const { can } = usePermissions();
  const { busy, send } = useSend();
  const [open, setOpen] = useState<number | null>(null);
  const [decorative, setDecorative] = useState(false);
  const altOf = (id: number): ImageAlt => product.imageAlts?.find((alt) => alt.id === id) ?? { id, ar: "", en: "", decorative: false };
  const editable = can("seo:edit") || can("products:edit");
  const editing = open === null ? null : altOf(open);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const alt = { id: editing.id, en: String(form.get("en") ?? "").trim(), ar: String(form.get("ar") ?? "").trim(), decorative };
    const problem = altProblem(alt);
    if (problem) {
      toast(problem);
      return;
    }
    const body = { alt: decorative ? { en: "", ar: "" } : { en: alt.en, ar: alt.ar }, decorative };
    if (await send("PATCH", SEO_API.imageAlt(product.id, editing.id), body, { done: "Alt text saved" })) setOpen(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg"><T>Image alt text</T></CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {product.imageIds.length === 0 ? (
          <Note>This product has no photos.</Note>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {product.imageIds.map((id, index) => {
              const alt = altOf(id);
              const missing = altProblem(alt) !== null;
              return (
                <li key={id} className="flex gap-3 rounded-lg border p-2.5">
                  <Image unoptimized src={`/api/products/${product.id}/images/${id}`} alt={alt.decorative ? "" : alt.en} width={72} height={72} className="size-18 shrink-0 rounded-md bg-muted object-cover" />
                  <div className="grid min-w-0 flex-1 content-start gap-1 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium"><T>Photo</T> <span className="num">{index + 1}</span></span>
                      {alt.decorative ? <Status tone="mute">Decorative</Status> : missing ? <Status tone="warn">Missing alt</Status> : null}
                    </div>
                    {alt.decorative ? null : (
                      <>
                        <span className="truncate">{alt.en || "—"}</span>
                        <span dir="rtl" className="truncate text-muted-foreground">{alt.ar || "—"}</span>
                      </>
                    )}
                    {editable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        aria-label={`Edit alt text of photo ${index + 1}`}
                        onClick={() => {
                          setDecorative(alt.decorative);
                          setOpen(id);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        <T>Edit</T>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Note>Empty alt text falls back to the product name and the view on the website.</Note>
      </CardContent>
      {editing ? (
        <Modal title="Image alt text" onClose={() => setOpen(null)}>
          <form key={editing.id} className="grid gap-4" onSubmit={save} noValidate>
            <Image unoptimized src={`/api/products/${product.id}/images/${editing.id}`} alt="" width={160} height={160} className="size-40 rounded-lg bg-muted object-cover" />
            <div className="flex items-center gap-2">
              <Checkbox id="alt-decorative" checked={decorative} onCheckedChange={(on) => setDecorative(on === true)} />
              <Label htmlFor="alt-decorative" className="font-normal">Decorative (no alt text)</Label>
            </div>
            {decorative ? null : (
              <>
                <TextField label="Alt text (English)" name="en" defaultValue={editing.en} placeholder="Gold Era 10 g gold bar, front" />
                <TextField label="Alt text (Arabic)" name="ar" dir="rtl" defaultValue={editing.ar} />
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy}><T>Save alt text</T></Button>
              <Button type="button" variant="outline" onClick={() => setOpen(null)}><T>Cancel</T></Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </Card>
  );
}
