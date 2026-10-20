import Link from "next/link";
import { type ComponentProps, type ReactNode, useId } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/date-field";
import { Select } from "@/components/select";
import { T, useT } from "@/components/t";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// The few pieces every screen is built from, each a thin layer over a library component, so
// the fourteen screens look and behave as one.

/** The sentence under the page title that says what the screen is for. */
export function Intro({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p dir="auto" className={cn("max-w-[70ch] text-sm text-muted-foreground rtl:text-right", className)}>
      <T>{children}</T>
    </p>
  );
}

export type Tone = "ok" | "warn" | "bad" | "info" | "mute";
const TONES = { ok: "success", warn: "warning", bad: "destructive", info: "info", mute: "muted" } as const;

/** A status word in its colour: `<Status tone="ok">Active</Status>`. */
export function Status({ tone, children }: { tone: Tone | string; children: ReactNode }) {
  return <Badge variant={TONES[tone as Tone] ?? "muted"}><T>{children}</T></Badge>;
}

/** Sub-tabs that are links: the open tab lives in the URL, so Back and reload keep it. */
export function LinkTabs({ current, items }: { current: string; items: { key: string; label: ReactNode; href: string }[] }) {
  return (
    <Tabs value={current} className="w-full min-w-0 sm:w-fit sm:max-w-full">
      <TabsList className="h-auto w-full flex-nowrap justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none] sm:w-fit sm:max-w-full [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <TabsTrigger key={item.key} value={item.key} asChild>
            <Link href={item.href} scroll={false}>
              <T>{item.label}</T>
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** A card that holds a table. The table scrolls sideways inside it on a narrow screen; the page never does. */
export function TableCard({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("gap-0 overflow-hidden py-0", className)}>{children}</Card>;
}

/** The second, quieter line of a table cell. */
export function Note({ children, className, ...props }: ComponentProps<"small">) {
  return (
    <small className={cn("block text-xs font-normal text-muted-foreground", className)} {...props}>
      <T>{children}</T>
    </small>
  );
}

/** The one row of a table that has nothing to list. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell dir="auto" colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        <T>{children}</T>
      </TableCell>
    </TableRow>
  );
}

/** A form's fields, three to a row on a desktop and one on a phone. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

/** A labelled text input. Every other prop goes to the input. */
export function TextField({ label, className, id, ...props }: ComponentProps<typeof Input> & { label: string }) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input id={fieldId} className="bg-card" {...props} />
    </div>
  );
}

/** A labelled text box of several lines, drawn like the single-line input. */
export function TextAreaField({ label, className, id, placeholder, ...props }: ComponentProps<"textarea"> & { label: string }) {
  const generated = useId();
  const fieldId = id ?? generated;
  const t = useT();
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <textarea
        id={fieldId}
        className="max-h-60 min-h-20 w-full min-w-0 resize-none [field-sizing:content] rounded-lg border border-input bg-card px-2.5 py-2 text-base leading-relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        // Translated line by line: a placeholder can show several example lines.
        placeholder={placeholder?.split("\n").map(t).join("\n")}
        {...props}
      />
    </div>
  );
}

/** A labelled select. Pass `<option>` children. */
export function SelectField({ label, className, id, children, ...props }: ComponentProps<typeof Select> & { label: string }) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Select id={fieldId} {...props}>
        {children}
      </Select>
    </div>
  );
}

/**
 * An on/off value in an Edit dialog (a table row only shows it as a word). In a form it
 * reads back as "1" or "0" under `name`.
 */
export function OnOffField({
  on,
  label = "Status",
  name = "active",
  yes = "Active",
  no = "Inactive",
}: {
  on: boolean;
  label?: string;
  name?: string;
  yes?: string;
  no?: string;
}) {
  return (
    <SelectField label={label} name={name} defaultValue={on ? "1" : "0"}>
      <option value="1">{yes}</option>
      <option value="0">{no}</option>
    </SelectField>
  );
}

/** A labelled date, typed as YYYY-MM-DD or picked from a calendar. */
export function DateTextField({ label, className, id, ...props }: ComponentProps<typeof DateField> & { label: string }) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <DateField id={fieldId} aria-label={label} {...props} />
    </div>
  );
}
