"use client";

import { Pencil, RotateCcw } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Modal } from "@/components/modal";
import { Note, TextAreaField, TextField } from "@/components/parts";
import { T, useT } from "@/components/t";
import { toast } from "@/components/toast";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/lib/permissions";
import { type L, LANGS, SEO_API, SITE_CODE_FIELDS, type SiteSeo } from "@/lib/seo-api";
import { DEFAULT_ROBOTS, LANG_NAME, robotsProblem, urlProblem } from "@/lib/seo-rules";
import { useSend } from "@/lib/use-send";

type Kind = "text" | "l" | "url" | "code";
type Row = [path: string, label: string, kind: Kind];

// Each card of the screen and its fields, by their path in `SiteSeo`.
const CARDS: { key: string; title: string; note: string; rows: Row[]; superOnly?: boolean }[] = [
  {
    key: "business",
    title: "Business details",
    note: "One source for the header, footer, contact page and structured data. Empty values hide their block on the website.",
    rows: [
      ["business.siteName", "Site name", "l"],
      ["business.legalName", "Legal name", "l"],
      ["business.logoUrl", "Logo (SVG) address", "url"],
      ["business.logoPngUrl", "Logo (512 px PNG) address", "url"],
      ["business.defaultOgImageUrl", "Default social image address", "url"],
      ["business.hotline", "Hotline", "text"],
      ["business.whatsapp", "WhatsApp", "text"],
      ["business.email", "Email", "text"],
      ["business.address", "Branch address", "l"],
      ["business.mapLat", "Map latitude", "text"],
      ["business.mapLng", "Map longitude", "text"],
      ["business.mapUrl", "Map link", "url"],
      ["business.openingHours", "Opening hours", "l"],
      ["business.commercialRegister", "Commercial registration", "text"],
      ["business.taxRegistration", "Tax registration", "text"],
      ["business.hallmarking", "Hallmarking", "text"],
      ["business.socialUrls.instagram", "Instagram", "url"],
      ["business.socialUrls.facebook", "Facebook", "url"],
      ["business.socialUrls.tiktok", "TikTok", "url"],
      ["business.socialUrls.x", "X", "url"],
      ["business.socialUrls.youtube", "YouTube", "url"],
      ["business.socialUrls.linkedin", "LinkedIn", "url"],
      ["business.appStoreUrl", "App Store", "url"],
      ["business.googlePlayUrl", "Google Play", "url"],
    ],
  },
  {
    key: "titles",
    title: "Page titles",
    note: "Used by the SEO templates as the brand at the end of a title.",
    rows: [
      ["titleSeparator", "Title separator", "text"],
      ["brandSuffix", "Brand suffix", "l"],
    ],
  },
  {
    key: "robots",
    title: "robots.txt",
    note: "Served at /robots.txt. It must keep its Sitemap: line.",
    rows: [["robotsTxt", "robots.txt", "code"]],
  },
  {
    key: "tracking",
    title: "Verification and tracking",
    note: "The codes Search Console, Bing and Meta give for verifying the domain, and the Google Tag Manager container.",
    rows: [
      ["verification.google", "Google Search Console code", "text"],
      ["verification.bing", "Bing Webmaster code", "text"],
      ["verification.meta", "Meta domain verification code", "text"],
      ["gtmId", "Google Tag Manager ID", "text"],
    ],
  },
  {
    key: "code",
    title: "Global code",
    note: "Code added to every page. Only the super administrator can change it.",
    superOnly: true,
    rows: [
      ["headCode", "Head code", "code"],
      ["bodyStartCode", "Body start code", "code"],
      ["bodyEndCode", "Body end code", "code"],
    ],
  },
];

const get = (site: SiteSeo, path: string): unknown => path.split(".").reduce<unknown>((at, part) => (at as Record<string, unknown>)?.[part], site);

/** A copy of `site` with `value` at `path`. */
function put(site: SiteSeo, path: string, value: unknown): SiteSeo {
  const copy = structuredClone(site) as unknown as Record<string, unknown>;
  const parts = path.split(".");
  let at = copy;
  for (const part of parts.slice(0, -1)) at = at[part] as Record<string, unknown>;
  at[parts[parts.length - 1]] = value;
  return copy as unknown as SiteSeo;
}

export function SiteSettings({ site }: { site: SiteSeo }) {
  const t = useT();
  const { can, superAdmin } = usePermissions();
  const { busy, send } = useSend();
  const [open, setOpen] = useState<string | null>(null);
  const [robots, setRobots] = useState(site.robotsTxt);
  const card = CARDS.find((c) => c.key === open) ?? null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card) return;
    const form = new FormData(event.currentTarget);
    let next = site;
    for (const [path, label, kind] of card.rows) {
      if (kind === "l") {
        next = put(next, path, Object.fromEntries(LANGS.map((l) => [l, String(form.get(`${path}.${l}`) ?? "").trim()])));
        continue;
      }
      const value = path === "robotsTxt" ? robots : String(form.get(path) ?? "").trim();
      if (kind === "url" && urlProblem(value)) return toast(`${t(label)}: ${t("Use a full address that starts with https://")}`);
      if (path === "gtmId" && value && !/^GTM-[A-Z0-9]+$/.test(value)) return toast("The Tag Manager ID looks like GTM-XXXXXXX");
      next = put(next, path, value);
    }
    if (card.key === "robots" && robotsProblem(robots)) return toast(robotsProblem(robots) ?? "");
    // Code fields are SUPER_ADMIN's: anyone else sends the rest and leaves them as the server holds them.
    const body: Partial<SiteSeo> = { ...next };
    if (!superAdmin) for (const field of SITE_CODE_FIELDS) delete body[field];
    if (await send("PUT", SEO_API.site, body, { done: "Site settings saved" })) setOpen(null);
  }

  const value = (path: string, kind: Kind) => {
    const v = get(site, path);
    if (kind === "l") {
      const l = (v ?? { en: "", ar: "" }) as L;
      return l.en || l.ar ? (
        <span className="grid">
          <span>{l.en || "—"}</span>
          <span dir="rtl" className="text-muted-foreground">{l.ar || "—"}</span>
        </span>
      ) : <span className="text-muted-foreground">—</span>;
    }
    const text = String(v ?? "");
    if (!text) return <span className="text-muted-foreground">—</span>;
    return kind === "code" ? <pre dir="ltr" className="max-h-60 overflow-auto rounded-md bg-muted p-2 text-start font-mono text-xs whitespace-pre-wrap">{text}</pre> : <span dir="ltr">{text}</span>;
  };

  return (
    <div className="grid max-w-4xl gap-5">
      {CARDS.map((c) => {
        const editable = can("seo:edit") && (!c.superOnly || superAdmin);
        return (
          <Card key={c.key}>
            <CardHeader>
              <CardTitle className="font-heading text-lg"><T>{c.title}</T></CardTitle>
              {editable ? (
                <CardAction>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${c.title}`}
                    onClick={() => {
                      setRobots(site.robotsTxt);
                      setOpen(c.key);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    <T>Edit</T>
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-3">
              <Note>{c.note}</Note>
              <dl className={c.rows.length > 1 ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}>
                {c.rows.map(([path, label, kind]) => (
                  <div key={path} className={kind === "code" ? "min-w-0 rounded-lg bg-muted/60 px-3 py-2.5 sm:col-span-2" : "min-w-0 rounded-lg bg-muted/60 px-3 py-2.5"}>
                    <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"><T>{label}</T></dt>
                    <dd className="mt-0.5 text-sm [overflow-wrap:anywhere]">{value(path, kind)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        );
      })}
      {card ? (
        <Modal wide title={card.title} onClose={() => setOpen(null)}>
          <form className="grid gap-4" onSubmit={save} noValidate>
            <div className={card.rows.length > 1 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
              {card.rows.map(([path, label, kind]) =>
                kind === "l" ? (
                  LANGS.map((l) => (
                    <TextField key={`${path}.${l}`} label={`${t(label)} (${t(LANG_NAME[l])})`} name={`${path}.${l}`} dir={l === "ar" ? "rtl" : "ltr"} defaultValue={((get(site, path) ?? {}) as L)[l] ?? ""} />
                  ))
                ) : path === "robotsTxt" ? (
                  <div key={path} className="grid gap-2">
                    <TextAreaField label={label} dir="ltr" value={robots} onChange={(event) => setRobots(event.target.value)} />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setRobots(DEFAULT_ROBOTS)}>
                        <RotateCcw aria-hidden="true" />
                        <T>Reset to default</T>
                      </Button>
                      {robotsProblem(robots) ? <span className="text-xs text-destructive"><T>{robotsProblem(robots) ?? ""}</T></span> : null}
                    </div>
                  </div>
                ) : kind === "code" ? (
                  <TextAreaField key={path} label={label} name={path} dir="ltr" className="sm:col-span-2" defaultValue={String(get(site, path) ?? "")} />
                ) : (
                  <TextField key={path} label={label} name={path} dir="ltr" defaultValue={String(get(site, path) ?? "")} />
                ),
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy || (card.key === "robots" && robotsProblem(robots) !== null)}><T>Save</T></Button>
              <Button type="button" variant="outline" onClick={() => setOpen(null)}><T>Cancel</T></Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
