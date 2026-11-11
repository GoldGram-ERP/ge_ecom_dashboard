"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Note, Status, TableCard, TextAreaField, TextField } from "@/components/parts";
import { RichTextEditor } from "@/components/rich-text";
import { Switch } from "@/components/switch";
import { T, useT } from "@/components/t";
import { toast } from "@/components/toast";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatStamp } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import { type HealthRow, type L, type Lang, LANGS, type PublicProduct, SEO_API, type SeoChange, type SeoEntry, type SeoType, type Templates } from "@/lib/seo-api";
import {
  DESCRIPTION_MAX,
  fillTemplate,
  headCodeProblem,
  LANG_NAME,
  lengthWarning,
  previewTrim,
  sitemapLock,
  TITLE_MAX,
  urlProblem,
} from "@/lib/seo-rules";
import { useSend } from "@/lib/use-send";
import { ImageAlts } from "./image-alts";

const LABELS = {
  title: "SEO title",
  description: "Meta description",
  h1: "H1",
  canonical: "Canonical URL",
  ogTitle: "OG title",
  ogDescription: "OG description",
  ogImageUrl: "OG image address",
  breadcrumbLabel: "Breadcrumb label",
  introHtml: "Intro text",
  faq: "FAQ",
  headCode: "Custom head code",
  focusKeyword: "Focus keyword",
};

const LOCK_REASON = {
  noindex: "Off because the page is noindex.",
  redirected: "Off because a redirect sends this address elsewhere.",
  canonical: "Off because the canonical URL points at another page.",
};

type LKey = "title" | "description" | "h1" | "ogTitle" | "ogDescription" | "breadcrumbLabel";

/** The characters typed against the limit, and the warning the field table asks for. */
function Counter({ kind, value, duplicate }: { kind: "title" | "description"; value: string; duplicate: boolean }) {
  const warning = lengthWarning(kind, value);
  const limit = kind === "title" ? `${TITLE_MAX}` : `70–${DESCRIPTION_MAX}`;
  return (
    <span className="flex flex-wrap gap-x-3 text-xs" aria-live="polite">
      <span dir="ltr" className={warning ? "num text-warning" : "num text-muted-foreground"}>
        {value.trim().length} / {limit}
      </span>
      {warning === "long" ? <span className="text-warning"><T>{kind === "title" ? "Longer than 60 characters: Google may cut it." : "Longer than 155 characters: Google may cut it."}</T></span> : null}
      {warning === "short" ? <span className="text-warning"><T>Shorter than 70 characters: say a little more.</T></span> : null}
      {duplicate ? <span className="text-destructive"><T>Another page uses the same text.</T></span> : null}
    </span>
  );
}

/** One label above its value, as every View panel in the dashboard shows it. */
function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 min-w-0 rounded-lg bg-muted/60 px-3 py-2.5" : "min-w-0 rounded-lg bg-muted/60 px-3 py-2.5"}>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"><T>{label}</T></dt>
      <dd className="mt-0.5 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

const shown = (text: string, dir: "ltr" | "rtl" = "ltr") => (text.trim() ? <span dir={dir}>{text}</span> : <span className="text-muted-foreground">—</span>);

export function EntryScreen({
  type,
  entityKey,
  name,
  fixedName,
  entry,
  history,
  template,
  siteName,
  siteUrl,
  path,
  redirected,
  duplicates,
  intro,
  product,
}: {
  type: SeoType;
  entityKey: string;
  name: L;
  /** A static page or category: its English name is the dashboard's wording, translated. */
  fixedName: boolean;
  entry: SeoEntry;
  history: SeoChange[];
  template: Templates[keyof Templates] | null;
  siteName: L;
  siteUrl: string;
  path: string;
  redirected: boolean;
  duplicates: HealthRow[];
  intro: boolean;
  product: PublicProduct | null;
}) {
  const t = useT();
  const { can, superAdmin } = usePermissions();
  const { busy, send } = useSend();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry);
  const [lang, setLang] = useState<Lang>("en");
  const current = editing ? draft : entry;

  const entityName = (l: Lang) => (l === "ar" && name.ar) || (fixedName ? t(name.en) : name.en);
  const urlOf = (l: Lang) => `${siteUrl}${l === "en" ? (path === "/" ? "/en" : `/en${path}`) : path}`;
  const ownUrls = LANGS.map(urlOf);
  const lock = sitemapLock(current, ownUrls, redirected);
  const isDuplicate = (issue: "duplicate_title" | "duplicate_description", l: Lang) =>
    duplicates.some((row) => row.issue === issue && (!row.lang || row.lang === l));

  // What the storefront falls back to: the page-type template with what the dashboard knows filled in.
  const values = (l: Lang): Record<string, string> => ({
    name: entityName(l),
    site: siteName[l],
    year: String(new Date().getFullYear()),
    brand: l === "ar" ? (product?.manufacturerAr ?? "") : (product?.manufacturerEn ?? ""),
    weight: product ? `${product.weightGrams}` : "",
    karat: product ? String(product.karat) : "",
  });
  const effective = (field: "title" | "description", l: Lang) => current[field][l].trim() || fillTemplate(template?.[l][field] ?? "", values(l));

  const setL = (field: LKey, l: Lang, value: string) => setDraft((d) => ({ ...d, [field]: { ...d[field], [l]: value } }));

  function startEdit() {
    setDraft(entry);
    setEditing(true);
  }

  async function save() {
    const problem = urlProblem(draft.canonical) ?? urlProblem(draft.ogImageUrl) ?? (superAdmin ? headCodeProblem(draft.headCode) : null);
    if (problem) {
      toast(problem);
      return;
    }
    const body: Partial<SeoEntry> = {
      ...draft,
      canonical: draft.canonical.trim(),
      inSitemap: lock ? false : draft.inSitemap,
      faq: draft.faq.filter((pair) => pair.q.en.trim() || pair.q.ar.trim()),
      headCode: draft.headCode.trim(),
    };
    // The address names the entry; the server stamps the time. Only SUPER_ADMIN may write head
    // code: anyone else leaves it as the server holds it.
    delete body.type;
    delete body.key;
    delete body.updatedAt;
    if (!superAdmin) delete body.headCode;
    if (await send("PUT", SEO_API.entry(type, entityKey), body, { done: "SEO saved", labels: LABELS })) setEditing(false);
  }

  const pairField = (field: LKey, label: string, extra?: (l: Lang) => ReactNode) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {LANGS.map((l) => (
        <div key={l} className="grid gap-1">
          <TextField label={`${t(label)} (${t(LANG_NAME[l])})`} dir={l === "ar" ? "rtl" : "ltr"} value={draft[field][l]} onChange={(event) => setL(field, l, event.target.value)} />
          {extra?.(l)}
        </div>
      ))}
    </div>
  );

  const moveFaq = (from: number, to: number) =>
    setDraft((d) => {
      const faq = [...d.faq];
      const [pair] = faq.splice(from, 1);
      faq.splice(to, 0, pair);
      return { ...d, faq };
    });
  const setFaq = (index: number, part: "q" | "a", l: Lang, value: string) =>
    setDraft((d) => ({ ...d, faq: d.faq.map((pair, i) => (i === index ? { ...pair, [part]: { ...pair[part], [l]: value } } : pair)) }));

  const switchRow = (label: string, hint: string, on: boolean, toggle: (() => void) | null) => (
    <li className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <span className="text-sm font-medium"><T>{label}</T></span>
        {hint ? <Note>{hint}</Note> : null}
      </div>
      <Switch on={on} label={label} locked={!toggle} onToggle={toggle ?? undefined} />
    </li>
  );

  return (
    <div className="grid max-w-5xl gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-xl">{entityName("en")}</h2>
          {name.ar ? <p dir="rtl" className="text-sm text-muted-foreground">{name.ar}</p> : null}
        </div>
        {can("seo:edit") && !editing ? (
          <Button type="button" variant="gold" onClick={startEdit}>
            <Pencil aria-hidden="true" />
            <T>Edit</T>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg"><T>Search preview</T></CardTitle>
          <CardAction>
            <Tabs value={lang} onValueChange={(value) => setLang(value === "ar" ? "ar" : "en")}>
              <TabsList>
                <TabsTrigger value="en" className="px-3"><T>English</T></TabsTrigger>
                <TabsTrigger value="ar" className="px-3"><T>Arabic</T></TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* Drawn like a Google result: site, address, title, description, cut where Google cuts. */}
          <div dir={lang === "ar" ? "rtl" : "ltr"} className="grid max-w-[600px] gap-1 rounded-lg border bg-card p-4 font-sans">
            <span className="text-sm text-foreground">{siteName[lang]}</span>
            <span dir="ltr" className="truncate text-xs text-muted-foreground rtl:text-right">{urlOf(lang).replace(/^https?:\/\//, "").split("/").filter(Boolean).join(" › ")}</span>
            <span className="text-lg leading-snug text-[#1a0dab]">{previewTrim(effective("title", lang), TITLE_MAX) || <T>No title yet</T>}</span>
            <span className="text-sm leading-relaxed text-muted-foreground">{previewTrim(effective("description", lang), DESCRIPTION_MAX) || <T>No description yet</T>}</span>
          </div>
          {!current.title[lang].trim() || !current.description[lang].trim() ? (
            <Note className="mt-2">Empty fields show the page-type template.</Note>
          ) : null}
        </CardContent>
      </Card>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Edit SEO</T></CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {pairField("title", "SEO title", (l) => <Counter kind="title" value={draft.title[l]} duplicate={isDuplicate("duplicate_title", l)} />)}
            <div className="grid gap-3 sm:grid-cols-2">
              {LANGS.map((l) => (
                <div key={l} className="grid gap-1">
                  <TextAreaField
                    label={`${t("Meta description")} (${t(LANG_NAME[l])})`}
                    dir={l === "ar" ? "rtl" : "ltr"}
                    value={draft.description[l]}
                    onChange={(event) => setL("description", l, event.target.value)}
                  />
                  <Counter kind="description" value={draft.description[l]} duplicate={isDuplicate("duplicate_description", l)} />
                </div>
              ))}
            </div>
            {pairField("h1", "H1")}
            {pairField("breadcrumbLabel", "Breadcrumb label")}
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Canonical URL" dir="ltr" value={draft.canonical} onChange={(event) => setDraft({ ...draft, canonical: event.target.value })} />
              <TextField label="Focus keyword" value={draft.focusKeyword} onChange={(event) => setDraft({ ...draft, focusKeyword: event.target.value })} />
            </div>
            <Note>Leave the canonical URL empty to use the page&apos;s own address. The focus keyword is a note for the team and is never shown on the website.</Note>

            <ul className="divide-y rounded-lg border p-3">
              {switchRow("Index this page", "Off adds noindex and takes the page out of the sitemap.", draft.index, () => setDraft({ ...draft, index: !draft.index }))}
              {switchRow("Follow links", "Rarely turned off.", draft.follow, () => setDraft({ ...draft, follow: !draft.follow }))}
              {switchRow("Show in sitemap", lock ? LOCK_REASON[lock] : "", lock ? false : draft.inSitemap, lock ? null : () => setDraft({ ...draft, inSitemap: !draft.inSitemap }))}
            </ul>

            <h3 className="font-heading text-base"><T>Social sharing</T></h3>
            {pairField("ogTitle", "OG title")}
            {pairField("ogDescription", "OG description")}
            <TextField label="OG image address" dir="ltr" value={draft.ogImageUrl} onChange={(event) => setDraft({ ...draft, ogImageUrl: event.target.value })} />
            <Note>A 1200 × 630 image. Empty uses the main image, else the site&apos;s default image.</Note>

            {intro ? (
              <>
                <h3 className="font-heading text-base"><T>Intro text</T></h3>
                <Note>80 to 150 words, shown above the product grid.</Note>
                <div className="grid gap-4 sm:grid-cols-2">
                  {LANGS.map((l) => (
                    <RichTextEditor
                      key={l}
                      label={`${t("Intro text")} (${t(LANG_NAME[l])})`}
                      dir={l === "ar" ? "rtl" : "ltr"}
                      value={draft.introHtml[l]}
                      onChange={(html) => setDraft((d) => ({ ...d, introHtml: { ...d.introHtml, [l]: html } }))}
                    />
                  ))}
                </div>
              </>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-base"><T>FAQ</T></h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, faq: [...draft.faq, { q: { en: "", ar: "" }, a: { en: "", ar: "" } }] })}>
                <Plus aria-hidden="true" />
                <T>Add question</T>
              </Button>
            </div>
            {draft.faq.length === 0 ? <Note>No questions: the page shows no FAQ block.</Note> : null}
            {draft.faq.map((pair, index) => (
              <section key={index} className="grid gap-3 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium"><T>Question</T> <span className="num">{index + 1}</span></span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => moveFaq(index, index - 1)}><ArrowUp /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === draft.faq.length - 1} onClick={() => moveFaq(index, index + 1)}><ArrowDown /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove question" onClick={() => setDraft({ ...draft, faq: draft.faq.filter((_, i) => i !== index) })}><Trash2 /></Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LANGS.map((l) => (
                    <div key={l} className="grid gap-3">
                      <TextField label={`${t("Question")} (${t(LANG_NAME[l])})`} dir={l === "ar" ? "rtl" : "ltr"} value={pair.q[l]} onChange={(event) => setFaq(index, "q", l, event.target.value)} />
                      <TextAreaField label={`${t("Answer")} (${t(LANG_NAME[l])})`} dir={l === "ar" ? "rtl" : "ltr"} value={pair.a[l]} onChange={(event) => setFaq(index, "a", l, event.target.value)} />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {superAdmin ? (
              <div className="grid gap-1">
                <TextAreaField label="Custom head code" dir="ltr" value={draft.headCode} onChange={(event) => setDraft({ ...draft, headCode: event.target.value })} />
                {headCodeProblem(draft.headCode) ? <span className="text-xs text-destructive"><T>{headCodeProblem(draft.headCode) ?? ""}</T></span> : <Note>JSON-LD only, checked before saving. It must not repeat the structured data the website already writes.</Note>}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="gold" disabled={busy} onClick={save}><T>Save SEO</T></Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}><T>Cancel</T></Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>SEO fields</T></CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2">
              {(["title", "description", "h1", "breadcrumbLabel", "ogTitle", "ogDescription"] as const).map((field) =>
                LANGS.map((l) => (
                  <Field key={`${field}-${l}`} label={`${t(LABELS[field])} (${t(LANG_NAME[l])})`}>
                    {shown(entry[field][l], l === "ar" ? "rtl" : "ltr")}
                    {field === "title" && isDuplicate("duplicate_title", l) ? <Note className="text-destructive">Another page uses the same text.</Note> : null}
                    {field === "description" && isDuplicate("duplicate_description", l) ? <Note className="text-destructive">Another page uses the same text.</Note> : null}
                  </Field>
                )),
              )}
              <Field label="Indexing">
                <Status tone={entry.index ? "ok" : "warn"}>{entry.index ? "Index" : "Noindex"}</Status>{" "}
                <Status tone={entry.follow ? "ok" : "warn"}>{entry.follow ? "Follow" : "Nofollow"}</Status>
              </Field>
              <Field label="Sitemap">
                <Status tone={lock || !entry.inSitemap ? "mute" : "info"}>{lock || !entry.inSitemap ? "Left out" : "Listed"}</Status>
                {lock ? <Note>{LOCK_REASON[lock]}</Note> : null}
              </Field>
              <Field label="Canonical URL" wide>{shown(entry.canonical)}</Field>
              <Field label="OG image address" wide>{shown(entry.ogImageUrl)}</Field>
              <Field label="Focus keyword">{shown(entry.focusKeyword)}</Field>
              <Field label="FAQ"><span className="num">{entry.faq.length}</span> <T>questions</T></Field>
              {intro ? (
                <Field label="Intro text" wide>
                  {entry.introHtml.en || entry.introHtml.ar ? <T>Written</T> : <span className="text-muted-foreground"><T>Not written</T></span>}
                </Field>
              ) : null}
              {superAdmin ? <Field label="Custom head code" wide>{entry.headCode ? <code className="text-xs">{entry.headCode}</code> : shown("")}</Field> : null}
            </dl>
          </CardContent>
        </Card>
      )}

      {product ? <ImageAlts product={product} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg"><T>Change history</T></CardTitle>
        </CardHeader>
        <CardContent>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col"><T>When</T></TableHead>
                  <TableHead scope="col"><T>Who</T></TableHead>
                  <TableHead scope="col"><T>Field</T></TableHead>
                  <TableHead scope="col"><T>Old value</T></TableHead>
                  <TableHead scope="col"><T>New value</T></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground"><T>No changes yet.</T></TableCell>
                  </TableRow>
                ) : (
                  history.map((change, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap"><T>{formatStamp(change.when)}</T></TableCell>
                      <TableCell>{change.who}</TableCell>
                      <TableCell dir="ltr" className="text-start">{change.field}</TableCell>
                      <TableCell dir="auto" className="max-w-64 whitespace-normal text-muted-foreground [overflow-wrap:anywhere]">{change.oldValue || "—"}</TableCell>
                      <TableCell dir="auto" className="max-w-64 whitespace-normal [overflow-wrap:anywhere]">{change.newValue || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableCard>
        </CardContent>
      </Card>
    </div>
  );
}
