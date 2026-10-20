"use client";

import { T } from "@/components/t";
import { Pencil, RotateCcw } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Modal } from "@/components/modal";
import { EmptyRow, Note, SelectField, Status, TableCard, TextAreaField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSend } from "@/lib/use-send";

/** The rewritten texts, as the backend holds them: a null language keeps the built-in wording. */
export type Saved = Record<string, { en: string | null; ar: string | null }>;

const EDITED = "__edited";
/** `{count}`-style blanks the website fills in: a rewritten text must keep them. */
const blanks = (text: string) => text.match(/\{\w+\}/g) ?? [];

export function TextsTable({
  defaults,
  saved,
}: {
  defaults: { en: Record<string, string>; ar: Record<string, string> };
  saved: Saved;
}) {
  const { busy, send } = useSend();
  const keys = Object.keys(defaults.en);
  const sections = [...new Set(keys.map((key) => key.split(".")[0]))];
  const [section, setSection] = useState(sections[0] ?? "");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const now = (key: string, language: "en" | "ar") => saved[key]?.[language] ?? defaults[language][key] ?? "";
  const edited = (key: string) => Boolean(saved[key]?.en || saved[key]?.ar);
  const wanted = query.trim().toLowerCase();
  // A search looks through every section; without one, the chosen section is listed.
  const shown = keys.filter((key) =>
    wanted
      ? `${key} ${now(key, "en")} ${now(key, "ar")}`.toLowerCase().includes(wanted)
      : section === EDITED
        ? edited(key)
        : key.startsWith(`${section}.`),
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = { key: editing };
    for (const language of ["en", "ar"] as const) {
      const text = String(form.get(language) ?? "").trim();
      const missing = blanks(defaults[language][editing] ?? "").filter((blank) => !text.includes(blank));
      if (text && missing.length > 0) {
        toast(`Keep ${missing.join(" and ")} in the ${language === "en" ? "English" : "Arabic"} text: the website fills it in`);
        return;
      }
      // The built-in wording typed back is not a rewrite: store nothing for it.
      body[language] = text === defaults[language][editing] ? "" : text;
    }
    if (await send("PUT", "/admin/site-texts", body, { done: "Text saved" })) setEditing(null);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <SelectField label="Section" value={section} onChange={(event) => setSection(event.target.value)}>
          {sections.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={EDITED}>Rewritten texts</option>
        </SelectField>
        <TextField
          label="Search every section"
          type="search"
          placeholder="A word from the text, or its key"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Text</T></TableHead>
              <TableHead scope="col"><T>English</T></TableHead>
              <TableHead scope="col">العربية</TableHead>
              <TableHead scope="col">
                <span className="sr-only"><T>Edit</T></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <EmptyRow colSpan={4}><T>{wanted ? "No text matches this search." : "No text has been rewritten yet."}</T></EmptyRow>
            ) : (
              shown.map((key) => (
                <TableRow key={key}>
                  <TableCell className="align-top">
                    <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{key}</span>
                    {edited(key) ? (
                      <div className="mt-1">
                        <Status tone="info"><T>Rewritten</T></Status>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-80 align-top whitespace-normal" dir="ltr" lang="en">{now(key, "en")}</TableCell>
                  <TableCell className="max-w-80 align-top whitespace-normal" dir="rtl" lang="ar">
                    {now(key, "ar")}
                  </TableCell>
                  <TableCell className="text-end align-top">
                    <Button type="button" variant="outline" className="bg-card" aria-label={`Edit ${key}`} onClick={() => setEditing(key)}>
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
      {editing ? (
        <Modal title="Edit text" description={editing} onClose={() => setEditing(null)}>
          <form className="grid gap-4" onSubmit={save} noValidate>
            <div className="grid gap-1.5">
              <TextAreaField label="English" name="en" dir="ltr" lang="en" defaultValue={now(editing, "en")} rows={3} />
              <Note><T>Built-in:</T> {defaults.en[editing]}</Note>
            </div>
            <div className="grid gap-1.5">
              <TextAreaField label="العربية" name="ar" dir="rtl" lang="ar" defaultValue={now(editing, "ar")} rows={3} />
              <Note dir="rtl" lang="ar">
                {defaults.ar[editing]}
              </Note>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy}>
                <T>Save text</T>
              </Button>
              {edited(editing) ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (await send("PUT", "/admin/site-texts", { key: editing, en: "", ar: "" }, { done: "Built-in wording restored" })) {
                      setEditing(null);
                    }
                  }}
                >
                  <RotateCcw aria-hidden="true" />
                  <T>Restore built-in wording</T>
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                <T>Cancel</T>
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
