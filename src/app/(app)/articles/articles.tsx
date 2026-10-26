"use client";

import { T } from "@/components/t";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { isRowClick } from "@/components/link-row";
import { Confirm, Modal } from "@/components/modal";
import { EmptyRow, FormGrid, SelectField, Status, TableCard, TextField } from "@/components/parts";
import { RichTextEditor } from "@/components/rich-text";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, readResponse } from "@/lib/api";
import { formatStamp } from "@/lib/format";
import type { AdminArticle, ArticleType } from "@/lib/types";
import { useSend } from "@/lib/use-send";

const LABELS = {
  titleEn: "Title (EN)",
  titleAr: "العنوان (AR)",
  type: "Article type",
  publishedAt: "Publication date",
  bodyEn: "Content (English)",
  bodyAr: "Content (Arabic)",
  sortOrder: "Sort order",
  file: "Photo",
};

const TYPES: [ArticleType, string][] = [
  ["financial", "Financial"],
  ["educational", "Educational"],
  ["news", "News"],
  ["guide", "Guide"],
];

/** The same limits the server enforces, so a wrong file is refused before it is sent. */
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** The articles screen. A row opens the article's dialog; values change only in that dialog. */
export function Articles({ items }: { items: AdminArticle[] }) {
  const { busy, send } = useSend();
  const router = useRouter();
  // `null` is closed, `"new"` is the create form; an article is held by id so it shows what the server holds.
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminArticle | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const editing = typeof open === "number" ? (items.find((item) => item.id === open) ?? null) : null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("titleEn") || !text("titleAr")) {
      toast("Give the article a title in both languages");
      return;
    }
    const date = text("publishedAt");
    const done = await send(
      editing ? "PATCH" : "POST",
      editing ? `/admin/articles/${editing.id}` : "/admin/articles",
      {
        titleEn: text("titleEn"),
        titleAr: text("titleAr"),
        type: text("type"),
        bodyEn: String(form.get("bodyEn") ?? ""),
        bodyAr: String(form.get("bodyAr") ?? ""),
        published: text("published") === "1",
        ...(date ? { publishedAt: new Date(date).toISOString() } : {}),
      },
      { done: editing ? "Article saved" : "Article added", labels: LABELS },
    );
    if (done) setOpen(null);
  }

  /** Uploads a picture for the editor and returns the URL of the new image, or null when it failed. */
  async function insertImage(file: File) {
    if (!editing) return null;
    if (!PHOTO_TYPES.includes(file.type)) { toast("Choose a JPEG, PNG or WebP picture"); return null; }
    if (file.size > PHOTO_MAX_BYTES) { toast("The picture is larger than 2 MB"); return null; }
    try {
      const body = new FormData();
      body.append("file", file);
      const article = await readResponse<{ imageIds: number[] }>(await fetch(`/api/admin/articles/${editing.id}/images`, { method: "POST", credentials: "same-origin", body }));
      const added = article.imageIds.filter((id) => !editing.imageIds.includes(id)).pop();
      if (added === undefined) return null;
      router.refresh();
      return `/api/articles/${editing.id}/images/${added}`;
    } catch (error) {
      toast(errorMessage(error, LABELS));
      return null;
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !editing) return;
    if (!PHOTO_TYPES.includes(file.type)) return toast("Choose a JPEG, PNG or WebP picture");
    if (file.size > PHOTO_MAX_BYTES) return toast("The picture is larger than 2 MB");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      await readResponse(await fetch(`/api/admin/articles/${editing.id}/images`, { method: "POST", credentials: "same-origin", body }));
      toast("Photo added");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error, LABELS));
    }
    setUploading(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="gold" onClick={() => setOpen("new")}>
          <Plus aria-hidden="true" />
          <T>Create new</T>
        </Button>
      </div>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Title (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Article type</T></TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
              <TableHead scope="col"><T>Publication date</T></TableHead>
              <TableHead scope="col">
                <span className="sr-only"><T>Actions</T></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <EmptyRow colSpan={5}><T>No articles yet.</T></EmptyRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (isRowClick(event)) setOpen(item.id);
                  }}
                >
                  <TableCell className="whitespace-normal">
                    <Button type="button" variant="link" className="h-auto p-0 text-start font-medium text-foreground" aria-label={`Open ${item.titleEn}`} onClick={() => setOpen(item.id)}>
                      {item.titleEn}
                    </Button>
                    <small dir="rtl" className="block text-xs text-muted-foreground">{item.titleAr}</small>
                  </TableCell>
                  <TableCell><T>{TYPES.find(([type]) => type === item.type)?.[1] ?? item.type}</T></TableCell>
                  <TableCell>
                    <Status tone={item.published ? "ok" : "mute"}><T>{item.published ? "Published" : "Draft"}</T></Status>
                  </TableCell>
                  <TableCell>{formatStamp(item.publishedAt)}</TableCell>
                  <TableCell className="text-end">
                    <Button type="button" variant="outline" className="bg-card" aria-label={`Edit ${item.titleEn}`} onClick={() => setOpen(item.id)}>
                      <Pencil aria-hidden="true" />
                      <T>Edit</T>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
      {open === "new" || editing ? (
        <Modal
          wide
          title={editing ? "Edit article" : "New article"}
          onClose={() => setOpen(null)}
          actions={
            editing ? (
              <Button type="button" variant="outline" size="sm" className="bg-card text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => setDeleting(editing)}>
                <Trash2 aria-hidden="true" />
                <T>Delete</T>
              </Button>
            ) : undefined
          }
        >
          <form key={editing?.id ?? "new"} className="grid gap-4" onSubmit={save} noValidate>
            <FormGrid className="lg:grid-cols-2">
              <TextField label="Title (EN)" name="titleEn" defaultValue={editing?.titleEn} type="text" />
              <TextField label="العنوان (AR)" name="titleAr" defaultValue={editing?.titleAr} type="text" dir="rtl" />
              <SelectField label="Article type" name="type" defaultValue={editing?.type ?? "financial"}>
                {TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <TextField label="Publication date" name="publishedAt" defaultValue={editing?.publishedAt.slice(0, 10)} type="date" />
              <SelectField label="Status" name="published" defaultValue={editing?.published ? "1" : "0"}>
                <option value="1">Published</option>
                <option value="0">Draft</option>
              </SelectField>
            </FormGrid>
            <div className="grid gap-4 sm:grid-cols-2">
              <RichTextEditor label="Content (English)" name="bodyEn" value={editing?.bodyEn ?? ""} onInsertImage={editing ? insertImage : undefined} imageHint="Save the article first, then add images" />
              <RichTextEditor label="Content (Arabic)" name="bodyAr" value={editing?.bodyAr ?? ""} dir="rtl" onInsertImage={editing ? insertImage : undefined} imageHint="Save the article first, then add images" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy}>
                <T>Save article</T>
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(null)}>
                <T>Cancel</T>
              </Button>
            </div>
          </form>
          {editing ? (
            <div className="grid gap-3">
              <h3 className="font-heading text-sm font-medium"><T>Images (</T>{editing.imageIds.length})</h3>
              {editing.imageIds.length === 0 ? (
                <p className="text-sm text-muted-foreground"><T>No photos yet.</T></p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {editing.imageIds.map((imageId, index) => (
                    <li key={imageId} className="grid gap-2">
                      <Image
                        unoptimized
                        src={`/api/articles/${editing.id}/images/${imageId}`}
                        alt={`${editing.titleEn}, photo ${index + 1}`}
                        width={240}
                        height={240}
                        className="aspect-square w-full rounded-lg bg-muted object-cover"
                      />
                      <Button type="button" variant="outline" size="sm" className="bg-card" aria-label={`Remove photo ${index + 1}`} disabled={busy} onClick={() => setRemoving(imageId)}>
                        <Trash2 aria-hidden="true" />
                        <T>Remove</T>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <input ref={picker} type="file" accept={PHOTO_TYPES.join(",")} hidden tabIndex={-1} aria-hidden="true" onChange={upload} />
                <Button type="button" variant="outline" className="bg-card" disabled={uploading} onClick={() => picker.current?.click()}>
                  <ImagePlus aria-hidden="true" />
                  <T>{uploading ? "Adding…" : "Add photo"}</T>
                </Button>
                <span className="text-xs text-muted-foreground"><T>JPEG, PNG or WebP, up to 2 MB each</T></span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground"><T>Photos can be added from Edit once the article is created.</T></p>
          )}
        </Modal>
      ) : null}
      {deleting ? (
        <Confirm
          question={`Delete ${deleting.titleEn}?`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            if (await send("DELETE", `/admin/articles/${deleting.id}`, undefined, { done: "Article deleted" })) setOpen(null);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
      {removing !== null && editing ? (
        <Confirm
          question="Remove this photo?"
          confirmLabel="Remove"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/articles/${editing.id}/images/${removing}`, undefined, { done: "Photo removed" });
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </>
  );
}
