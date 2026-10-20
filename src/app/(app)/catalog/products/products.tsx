"use client";

import { T } from "@/components/t";
import { Download, Eye, ImagePlus, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { CountCards } from "@/components/count-cards";
import { isRowClick } from "@/components/link-row";
import { Confirm, Modal } from "@/components/modal";
import { FormGrid, Intro, Note, SelectField, Status, TableCard, TextAreaField, TextField } from "@/components/parts";
import { RowAction, RowActions, RowActionsSeparator } from "@/components/row-actions";
import { toast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage, readResponse } from "@/lib/api";
import { formatNumber, formatStamp } from "@/lib/format";
import { formatEgp, parseEgpToPiastres, piastresToInput, totalLaborPiastres as totalLabor } from "@/lib/money";
import { buildHref } from "@/lib/query";
import type { Category, Manufacturer, Product, ProductType } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { downloadXlsx } from "@/lib/xlsx";

const LABELS = {
  nameEn: "Name (EN)",
  nameAr: "الاسم (AR)",
  categoryId: "Category",
  typeId: "Type",
  manufacturerId: "Manufacturer",
  karat: "Karat",
  weightGrams: "Weight (g)",
  stock: "Stock",
  laborPiastres: "Labor per gram (EGP)",
  descriptionEn: "Description (English)",
  descriptionAr: "Description (Arabic)",
  file: "Photo",
};

/** The same limits the server enforces, so a wrong file is refused before it is sent. */
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTOS_PER_PRODUCT = 6;

/** The products screen. A row opens the product's dialog; values change only on its "Edit" tab. "Price today" is the server's figure. */
export function Products({
  items,
  categories,
  types,
  manufacturers,
  requireStock,
  filter,
  ar,
}: {
  items: Product[];
  categories: Category[];
  types: ProductType[];
  manufacturers: Manufacturer[];
  requireStock: boolean;
  filter: string;
  ar: boolean;
}) {
  const { busy, send } = useSend();
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  // One product's dialog: it opens on "View", and nothing can be typed before "Edit" is chosen.
  // It holds the id, not the row, so it shows what the server holds after every change.
  const [open, setOpen] = useState<{ id: number; tab: "view" | "edit"; part: "details" | "images" } | null>(null);
  const opened = open ? (items.find((item) => item.id === open.id) ?? null) : null;
  const editing = open?.tab === "edit" ? opened : null;
  const close = () => {
    setAdding(false);
    setOpen(null);
  };
  const show = (item: Product, tab: "view" | "edit") => {
    setAdding(false);
    setOpen({ id: item.id, tab, part: "details" });
  };
  const nameOf = (item: Product) => (ar ? `${item.nameAr || item.nameEn} ${formatNumber(item.weightGrams, 4)} جم` : `${item.nameEn} ${formatNumber(item.weightGrams, 4)} g`);
  // The category, type and maker in the dashboard's language; English when the Arabic is empty.
  const named = (en: string, arabic?: string) => (ar && arabic) || en;
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  // The photo chosen in the "Add product" form; it is sent once the product exists.
  const newPicker = useRef<HTMLInputElement>(null);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  /** Why a picked file cannot be a product photo, or null. The server checks the bytes itself; this only saves a round trip. */
  function photoProblem(file: File): string | null {
    if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPEG, PNG or WebP picture";
    if (file.size > PHOTO_MAX_BYTES) return "The picture is larger than 2 MB";
    return null;
  }

  async function sendPhoto(productId: number, file: File): Promise<void> {
    const body = new FormData();
    body.append("file", file);
    await readResponse(await fetch(`/api/admin/catalog/products/${productId}/images`, { method: "POST", credentials: "same-origin", body }));
  }

  /** The file control's change: picks the file and clears the control, so the same file can be picked again. */
  function picked(event: ChangeEvent<HTMLInputElement>): File | null {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    const problem = file ? photoProblem(file) : null;
    if (problem) toast(problem);
    return problem ? null : file;
  }

  /** Adds a photo to the product whose dialog is open. */
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = picked(event);
    if (!file || !opened) return;
    setUploading(true);
    try {
      await sendPhoto(opened.id, file);
      toast("Photo added");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error, LABELS));
    }
    setUploading(false);
  }
  const karatText = (item: Product) => (item.karat === 999 ? "999" : `${item.karat}K`);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const shown = items.filter((item) => filter === "all" || (filter === "active") === item.active);
  const here = (f: string) => buildHref("/catalog/products", { f });

  /** The rows on screen (the card filter applies), as an Excel file. */
  function exportExcel() {
    downloadXlsx("goldgram-products.xlsx", [
      ["ID", "Name (EN)", "Name (AR)", "Category", "Type", "Manufacturer", "Karat", "Weight (g)", "Stock", "Labor per gram (EGP)", "Total labor (EGP)", "Price today (EGP)", "Active"],
      ...shown.map((item) => [
        item.id,
        item.nameEn,
        item.nameAr,
        item.categoryName,
        item.typeName,
        item.manufacturerName,
        karatText(item),
        item.weightGrams,
        item.stock,
        item.laborPiastres / 100,
        totalLabor(item) / 100,
        item.priceTodayPiastres / 100,
        item.active ? "Yes" : "No",
      ]),
    ]);
    toast(`${shown.length} products exported`);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("nameEn")) {
      toast("Give the item a name");
      return;
    }
    const karat = Number(text("karat"));
    const weightGrams = Number(text("weightGrams"));
    const stock = Number(text("stock"));
    const labor = parseEgpToPiastres(text("labor"));
    if (
      ["karat", "weightGrams", "stock", "labor"].some((name) => text(name) === "") ||
      !Number.isFinite(karat) ||
      !Number.isFinite(weightGrams) ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      !labor.ok
    ) {
      toast("Fill in every number field");
      return;
    }
    if (!(weightGrams > 0 && karat > 0)) {
      toast("Weight and karat must be above zero");
      return;
    }
    if (categories.length === 0 || types.length === 0 || manufacturers.length === 0) {
      toast("Add a category, type and manufacturer first");
      return;
    }
    const body = {
        nameEn: text("nameEn"),
        nameAr: text("nameAr"),
        categoryId: Number(text("categoryId")),
        typeId: Number(text("typeId")),
        manufacturerId: Number(text("manufacturerId")),
        karat,
        weightGrams,
        stock,
        laborPiastres: labor.piastres,
        descriptionEn: text("descriptionEn"),
        descriptionAr: text("descriptionAr"),
    };
    // A new product with a photo: the product first (its id is needed), then the photo.
    if (!editing && newPhoto) {
      setCreating(true);
      try {
        const created = await api<Product>("/admin/catalog/products", { method: "POST", body });
        try {
          await sendPhoto(created.id, newPhoto);
          toast("Item added");
        } catch (error) {
          toast(`Item added, but its photo was not: ${errorMessage(error, LABELS)} Add it from Edit.`);
        }
        setNewPhoto(null);
        close();
      } catch (error) {
        toast(errorMessage(error, LABELS));
      }
      setCreating(false);
      router.refresh();
      return;
    }
    const added = await send(
      editing ? "PATCH" : "POST",
      editing ? `/admin/catalog/products/${editing.id}` : "/admin/catalog/products",
      body,
      { done: editing ? "Item saved" : "Item added", labels: LABELS },
    );
    if (added) close();
  }

  const form = (
    <form key={editing?.id ?? "new"} className="grid gap-4" onSubmit={save} noValidate>
      <FormGrid className={editing ? "lg:grid-cols-2" : undefined}>
        <TextField id="f_prod_n" label="Name (EN)" name="nameEn" defaultValue={editing?.nameEn} type="text" />
        <TextField id="f_prod_a" label="الاسم (AR)" name="nameAr" defaultValue={editing?.nameAr} type="text" dir="rtl" />
        <SelectField id="f_prod_c" label="Category" name="categoryId" defaultValue={editing?.categoryId}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {named(category.nameEn, category.nameAr)}
            </option>
          ))}
        </SelectField>
        <SelectField id="f_prod_t" label="Type" name="typeId" defaultValue={editing?.typeId}>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {named(type.nameEn, type.nameAr)}
            </option>
          ))}
        </SelectField>
        <SelectField id="f_prod_m" label="Manufacturer" name="manufacturerId" defaultValue={editing?.manufacturerId}>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {named(manufacturer.nameEn, manufacturer.nameAr)}
            </option>
          ))}
        </SelectField>
        <TextField id="f_prod_k" label="Karat (999 for silver)" name="karat" defaultValue={editing?.karat} type="number" min="0" step="any" />
        <TextField id="f_prod_g" label="Weight (g)" name="weightGrams" defaultValue={editing?.weightGrams} type="number" min="0" step="any" />
        <TextField id="f_prod_s" label="Stock" name="stock" defaultValue={editing?.stock} type="number" min="0" step="any" />
        <TextField id="f_prod_l" label="Labor per gram (EGP)" name="labor" defaultValue={editing ? piastresToInput(editing.laborPiastres) : undefined} type="number" min="0" step="any" />
      </FormGrid>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextAreaField id="f_prod_de" label="Description (English)" name="descriptionEn" defaultValue={editing?.descriptionEn} maxLength={2000} />
        <TextAreaField id="f_prod_da" label="Description (Arabic)" name="descriptionAr" defaultValue={editing?.descriptionAr} maxLength={2000} dir="rtl" />
      </div>
      {editing ? null : (
        <div className="flex flex-wrap items-center gap-3">
          {/* The browser's own file control stays hidden; the button opens its picker. */}
          <input ref={newPicker} type="file" accept={PHOTO_TYPES.join(",")} hidden tabIndex={-1} aria-hidden="true" onChange={(event) => setNewPhoto(picked(event) ?? newPhoto)} />
          <Button type="button" variant="outline" className="bg-card" onClick={() => newPicker.current?.click()}>
            <ImagePlus aria-hidden="true" />
            <T>{newPhoto ? "Change photo" : "Add photo"}</T>
          </Button>
          {newPhoto ? (
            <>
              <span className="text-sm [overflow-wrap:anywhere]">{newPhoto.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewPhoto(null)}>
                <T>Remove</T>
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground"><T>JPEG, PNG or WebP, up to 2 MB. More photos can be added from Edit.</T></span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="gold" disabled={busy || creating}>
          <T>Save item</T>
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          <T>Cancel</T>
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="bg-card" disabled={shown.length === 0} onClick={exportExcel}>
          <Download aria-hidden="true" />
          <T>Export to Excel</T>
        </Button>
        <Button type="button" variant="gold" aria-expanded={adding} onClick={() => {
            setOpen(null);
            setAdding(!adding);
          }}>
          {adding ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
          <T>{adding ? "Close form" : "Add product"}</T>
        </Button>
      </div>
      {adding ? (
        <Card>
          <CardContent>{form}</CardContent>
        </Card>
      ) : null}
      {open && opened ? (
        <Modal
          wide
          title={nameOf(opened)}
          onClose={close}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => {
                  setOpen(null);
                  setAdding(true);
                }}
              >
                <Plus aria-hidden="true" />
                <T>Create new</T>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-card"
                disabled={busy}
                onClick={() =>
                  send("PATCH", `/admin/catalog/products/${opened.id}`, { active: !opened.active }, { done: opened.active ? "Product deactivated" : "Product activated" })
                }
              >
                <RefreshCw aria-hidden="true" />
                <T>Toggle status</T>
              </Button>
              <Button type="button" variant="outline" size="sm" className="bg-card text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => setDeleting(opened)}>
                <Trash2 aria-hidden="true" />
                <T>Delete</T>
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Tabs value={open.tab} onValueChange={(tab) => setOpen({ ...open, tab: tab === "edit" ? "edit" : "view" })}>
              <TabsList>
                <TabsTrigger value="view" className="px-3">
                  <Eye aria-hidden="true" />
                  <T>View</T>
                </TabsTrigger>
                <TabsTrigger value="edit" className="px-3">
                  <Pencil aria-hidden="true" />
                  <T>Edit</T>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={open.part} onValueChange={(part) => setOpen({ ...open, part: part === "images" ? "images" : "details" })}>
              <TabsList>
                <TabsTrigger value="details" className="px-3">
                  <T>Details</T>
                </TabsTrigger>
                <TabsTrigger value="images" className="px-3">
                  <T>Images (</T>{opened.imageIds.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {open.part === "images" ? (
            <div className="grid gap-4">
              {opened.imageIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  <T>No photos yet.</T> <T>{editing ? "The first one you add is shown on the shop's card." : "Add them on the Edit tab."}</T>
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {opened.imageIds.map((imageId, index) => (
                    <li key={imageId} className="grid gap-2">
                      {/* Served as stored: the photo is small already, and its address never changes. */}
                      <Image
                        unoptimized
                        src={`/api/products/${opened.id}/images/${imageId}`}
                        alt={`${nameOf(opened)}, photo ${index + 1}`}
                        width={240}
                        height={240}
                        className="aspect-square w-full rounded-lg bg-muted object-cover"
                      />
                      {editing ? (
                        <Button type="button" variant="outline" size="sm" className="bg-card" aria-label={`Remove photo ${index + 1}`} disabled={busy} onClick={() => setRemoving(imageId)}>
                          <Trash2 aria-hidden="true" />
                          <T>Remove</T>
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {editing ? (
                <div className="flex flex-wrap items-center gap-3">
                  <input ref={picker} type="file" accept={PHOTO_TYPES.join(",")} hidden tabIndex={-1} aria-hidden="true" onChange={upload} />
                  <Button type="button" variant="gold" disabled={uploading || opened.imageIds.length >= PHOTOS_PER_PRODUCT} onClick={() => picker.current?.click()}>
                    <ImagePlus aria-hidden="true" />
                    <T>{uploading ? "Adding…" : "Add photo"}</T>
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    <span className="num">{opened.imageIds.length}</span> <T>of</T> {PHOTOS_PER_PRODUCT} <T>· JPEG, PNG or WebP, up to 2 MB each</T>
                  </span>
                </div>
              ) : null}
            </div>
          ) : editing ? (
            form
          ) : (
            <dl className="grid grid-cols-2 gap-2">
              {(
                [
                  ["ID", <span className="num" key="v">{opened.id}</span>],
                  ["Status", <Status tone={opened.active ? "ok" : "mute"} key="v"><T>{opened.active ? "Active" : "Inactive"}</T></Status>],
                  ["Name (EN)", opened.nameEn],
                  ["الاسم (AR)", <span dir="rtl" key="v">{opened.nameAr}</span>],
                  ["Category", named(opened.categoryName, opened.categoryNameAr)],
                  ["Type", named(opened.typeName, opened.typeNameAr)],
                  ["Manufacturer", named(opened.manufacturerName, opened.manufacturerNameAr)],
                  ["Karat", <span className="num" key="v"><T>{karatText(opened)}</T></span>],
                  ["Weight (g)", <span className="num" key="v">{formatNumber(opened.weightGrams, 4)}</span>],
                  ["Stock", <span className="num" key="v">{opened.stock}</span>],
                  ["Labor per gram (EGP)", <span className="num" key="v">{formatEgp(opened.laborPiastres)}</span>],
                  ["Total labor (EGP)", <span className="num" key="v">{formatEgp(totalLabor(opened))}</span>],
                  ["Price today (EGP)", <span className="num" key="v">{formatEgp(opened.priceTodayPiastres)}</span>],
                  ["Cashback", opened.cashback.valid ? "Valid" : "Not valid"],
                  ["Created", formatStamp(opened.createdAt)],
                  ["Updated", formatStamp(opened.updatedAt)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg bg-muted/60 px-3 py-2.5">
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"><T>{label}</T></dt>
                  <dd className="mt-0.5 font-medium [overflow-wrap:anywhere]"><T>{value}</T></dd>
                </div>
              ))}
              {(
                [
                  ["Description (English)", opened.descriptionEn, "ltr"],
                  ["Description (Arabic)", opened.descriptionAr, "rtl"],
                ] as const
              ).map(([label, value, dir]) => (
                <div key={label} className="col-span-2 min-w-0 rounded-lg bg-muted/60 px-3 py-2.5">
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"><T>{label}</T></dt>
                  <dd dir={dir} className={value ? "mt-0.5 whitespace-pre-line [overflow-wrap:anywhere]" : "mt-0.5 text-muted-foreground"}>
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Modal>
      ) : null}
      <CountCards
        current={filter}
        cards={[
          { key: "all", label: "Total", count: items.length, note: "All items", href: here("") },
          { key: "active", label: "Active", count: items.filter((item) => item.active).length, note: "In use", href: here("active") },
          { key: "inactive", label: "Inactive", count: items.filter((item) => !item.active).length, note: "Deactivated", href: here("inactive") },
        ]}
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Product (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Category</T></TableHead>
              <TableHead scope="col"><T>Type</T></TableHead>
              <TableHead scope="col"><T>Manufacturer</T></TableHead>
              <TableHead scope="col"><T>Karat</T></TableHead>
              <TableHead scope="col" className="text-end">
                <T>Weight (g)</T>
              </TableHead>
              <TableHead scope="col"><T>Stock</T></TableHead>
              <TableHead scope="col" className="text-end">
                <T>Total labor</T>
              </TableHead>
              <TableHead scope="col" className="text-end">
                <T>Price today</T>
              </TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
              <TableHead scope="col">
                <span className="sr-only"><T>Actions</T></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={(event) => {
                  if (isRowClick(event)) show(item, "view");
                }}
              >
                <TableCell>
                  {/* The name is the keyboard's way into the dialog; a pointer can use the whole row. */}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 font-medium text-foreground"
                    aria-label={`Open ${nameOf(item)}`}
                    onClick={() => show(item, "view")}
                  >
                    {ar ? item.nameAr : item.nameEn}
                  </Button>
                  <Note>{ar ? item.nameEn : item.nameAr}</Note>
                </TableCell>
                <TableCell>{named(item.categoryName, item.categoryNameAr)}</TableCell>
                <TableCell>{named(item.typeName, item.typeNameAr)}</TableCell>
                <TableCell>{named(item.manufacturerName, item.manufacturerNameAr)}</TableCell>
                <TableCell className="num"><T>{karatText(item)}</T></TableCell>
                <TableCell className="num text-end">{formatNumber(item.weightGrams, 4)}</TableCell>
                <TableCell>
                  <div className="grid justify-items-start gap-1">
                    <span className="num">{item.stock}</span>
                    {requireStock && item.stock === 0 ? <Status tone="bad"><T>Out of stock</T></Status> : null}
                  </div>
                </TableCell>
                <TableCell className="num text-end">{formatEgp(totalLabor(item))}</TableCell>
                <TableCell className="num text-end text-base text-secondary-foreground">
                  {formatEgp(item.priceTodayPiastres)}
                </TableCell>
                <TableCell>
                  <Status tone={item.active ? "ok" : "mute"}><T>{item.active ? "Active" : "Inactive"}</T></Status>
                </TableCell>
                <TableCell className="text-end">
                  <RowActions label={`Actions for ${item.nameEn} ${formatNumber(item.weightGrams, 4)} g`}>
                    <RowAction
                      label="Edit"
                      icon={<Pencil aria-hidden="true" />}
                      disabled={busy}
                      onSelect={() => show(item, "edit")}
                    />
                    <RowActionsSeparator />
                    <RowAction label="Delete" icon={<Trash2 aria-hidden="true" />} danger disabled={busy} onSelect={() => setDeleting(item)} />
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      {shown.length === 0 ? <Intro><T>Nothing here yet. Pick another card or add an item.</T></Intro> : null}
      <Intro className="text-xs">
        <T>Price = weight × today&apos;s price for the karat + labor. It changes when you publish a new
        master price.</T>
      </Intro>
      {deleting ? (
        <Confirm
          question={`Delete ${deleting.nameEn}?`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/catalog/products/${deleting.id}`, undefined, { done: "Item deleted" });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
      {removing !== null && opened ? (
        <Confirm
          question="Remove this photo?"
          confirmLabel="Remove"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/catalog/products/${opened.id}/images/${removing}`, undefined, { done: "Photo removed" });
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </>
  );
}
