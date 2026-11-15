"use client";

import { Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { T, useT } from "@/components/t";
import { toast } from "@/components/toast";
import { errorMessage, readResponse } from "@/lib/api";

const MAX_BYTES = 2 * 1024 * 1024;
const PICTURES = ["image/jpeg", "image/png", "image/webp"];
const SVG = "image/svg+xml";

/** Where the dashboard shows a saved picture: an uploaded one is served by the API under `/api`. */
export const imagePreview = (url: string): string => (url.startsWith("/images/") ? `/api${url}` : url);

/** A saved picture, shown small. */
export function Picture({ url, className = "max-h-16 max-w-40" }: { url: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- a stored picture of unknown size, an SVG included
  return <img src={imagePreview(url)} alt="" className={`${className} rounded-md border bg-background object-contain`} />;
}

/** What is wrong with a file chosen for upload, or null. The server checks the bytes again. */
export function imageFileProblem(file: { type: string; size: number }, svg: boolean): string | null {
  if (!(PICTURES.includes(file.type) || (svg && file.type === SVG))) return svg ? "Choose an SVG, JPEG, PNG or WebP picture" : "Choose a JPEG, PNG or WebP picture";
  if (file.size > MAX_BYTES) return "The picture is larger than 2 MB";
  return null;
}

/**
 * A picture the site uses (a logo, a social image): shown as it is, with Upload and Remove.
 * The file is uploaded at once and the field keeps its address; the screen's Save stores it.
 * With `name`, the address goes into the surrounding form under that name.
 */
export function ImageField({
  label,
  value,
  onChange,
  name,
  svg = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  name?: string;
  /** Accept an SVG too (a logo). */
  svg?: boolean;
  className?: string;
}) {
  const t = useT();
  const id = useId();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    const problem = imageFileProblem(file, svg);
    if (problem) return toast(problem);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const saved = await readResponse<{ url: string }>(await fetch("/api/admin/seo/images", { method: "POST", credentials: "same-origin", body }));
      onChange(saved.url);
      toast("Picture uploaded. Save to use it.");
    } catch (error) {
      toast(errorMessage(error));
    }
    setBusy(false);
  }

  return (
    <div className={className ? `grid gap-1.5 ${className}` : "grid gap-1.5"}>
      <span id={id} className="text-sm font-medium"><T>{label}</T></span>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="flex flex-wrap items-center gap-3" role="group" aria-labelledby={id}>
        <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/60">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- a stored picture of unknown size, an SVG included
            <img src={imagePreview(value)} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground"><T>No picture</T></span>
          )}
        </div>
        <input ref={picker} type="file" accept={[...PICTURES, ...(svg ? [SVG] : [])].join(",")} hidden tabIndex={-1} aria-hidden="true" onChange={upload} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true" />
          <T>{busy ? "Uploading…" : value ? "Replace" : "Upload"}</T>
        </Button>
        {value ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} aria-label={`${t("Remove")}: ${t(label)}`} onClick={() => onChange("")}>
            <Trash2 aria-hidden="true" />
            <T>Remove</T>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
