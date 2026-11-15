"use client";

import { ArrowDown, ArrowUp, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Modal } from "@/components/modal";
import { Note, SelectField, Status, TextField } from "@/components/parts";
import { Switch } from "@/components/switch";
import { T, useT } from "@/components/t";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addPopular,
  blankColumn,
  blankGroup,
  blankLink,
  CHILDREN_MAX,
  COLUMN_LINKS_MAX,
  COLUMNS_MAX,
  HEADER_MAX,
  kindOf,
  layoutLabels,
  moveItem,
  pageChoices,
  pick,
  POPULAR_MAX,
  SECTION_NAMES,
  toggleSection,
  toPayload,
  withKind,
} from "@/lib/layout-rules";
import { usePermissions } from "@/lib/permissions";
import { type HomeSection, type L, type Layout, type LayoutAdmin, type MenuColumn, type MenuGroup, type MenuLink, SEO_API, type TargetPage } from "@/lib/seo-api";
import { useSend } from "@/lib/use-send";

type Open = "sections" | "popular" | "header" | "footer" | null;
const TYPE_ORDER = ["static", "category", "weight", "brand", "product", "guide"];
const TYPE_NAME: Record<string, string> = { static: "Page", category: "Category", weight: "Weight", brand: "Brand", product: "Product", guide: "Guide" };
const ROW = "flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm";

/** Up, down and remove for one row of a list. `what` names the row for a screen reader. */
function RowTools({ what, index, count, lock = 0, onMove, onRemove }: { what: string; index: number; count: number; lock?: number; onMove: (by: -1 | 1) => void; onRemove?: () => void }) {
  const t = useT();
  return (
    <div className="flex shrink-0 gap-1">
      <Button type="button" variant="outline" size="icon-sm" aria-label={`${t("Move up")}: ${what}`} disabled={index <= lock} onClick={() => onMove(-1)}>
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button type="button" variant="outline" size="icon-sm" aria-label={`${t("Move down")}: ${what}`} disabled={index < lock || index >= count - 1} onClick={() => onMove(1)}>
        <ArrowDown aria-hidden="true" />
      </Button>
      {onRemove ? (
        <Button type="button" variant="outline" size="icon-sm" aria-label={`${t("Remove")}: ${what}`} onClick={onRemove}>
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

/** One link: a page of the site or another address, with its two labels. */
function LinkEditor({ link, onChange, pages, parent = false }: { link: MenuLink; onChange: (link: MenuLink) => void; pages: TargetPage[]; parent?: boolean }) {
  const t = useT();
  // The dashboard has no language flag of its own: the Arabic dictionary changes "Edit".
  const arabic = t("Edit") !== "Edit";
  const [search, setSearch] = useState("");
  const kind = kindOf(link);
  const choices = pageChoices(pages, search, link.target, TYPE_ORDER);
  const label = (lang: keyof L, text: string) => (
    <TextField label={t(text)} dir={lang === "ar" ? "rtl" : "ltr"} value={link.label[lang]} onChange={(event) => onChange({ ...link, label: { ...link.label, [lang]: event.target.value } })} />
  );
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2 [&>*]:min-w-0">
      <SelectField label={t("Link to")} value={kind} onChange={(event) => onChange(withKind(link, event.target.value as "page" | "address"))}>
        <option value="page">A page of the site</option>
        <option value="address">Another address</option>
      </SelectField>
      {kind === "page" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <TextField label={t("Search pages")} value={search} onChange={(event) => setSearch(event.target.value)} />
          <SelectField label={t("Page")} value={link.target} onChange={(event) => onChange({ ...link, target: event.target.value })}>
            <option value="">{parent ? "No page (a title that only opens its dropdown)" : "Choose a page"}</option>
            {choices.map((page) => (
              <option key={page.target} value={page.target}>
                {`${t(TYPE_NAME[page.type])} · ${pick(page.name, arabic)}`}
              </option>
            ))}
          </SelectField>
        </div>
      ) : (
        <TextField label={t("Address")} dir="ltr" placeholder="/contact or https://example.com" value={link.url} onChange={(event) => onChange({ ...link, url: event.target.value })} />
      )}
      {label("en", "Label (English)")}
      {label("ar", "Label (Arabic)")}
      <Note className="sm:col-span-2">
        {kind === "page" ? "Leave the labels empty to use the page's own name." : parent ? "An entry with links under it may be a label alone: leave the address empty." : "Both labels are needed for an address."}
      </Note>
    </div>
  );
}

export function LayoutScreen({ data }: { data: LayoutAdmin }) {
  const t = useT();
  const arabic = t("Edit") !== "Edit";
  const { can } = usePermissions();
  const { busy, send } = useSend();
  const [open, setOpen] = useState<Open>(null);
  const [draft, setDraft] = useState<Layout>(data.layout);
  const { layout, pages, products } = data;
  const editable = can("seo:edit");
  const productName = (id: number) => {
    const product = products.find((p) => p.id === id);
    return product ? pick(product.name, arabic) : `#${id}`;
  };
  const pageByTarget = new Map(pages.map((page) => [page.target, page]));
  const sectionName = (section: HomeSection) => SECTION_NAMES[section][arabic ? 1 : 0];

  const edit = (card: Exclude<Open, null>) => {
    setDraft(structuredClone(layout));
    setOpen(card);
  };
  const setHome = (home: Partial<Layout["home"]>) => setDraft((d) => ({ ...d, home: { ...d.home, ...home } }));
  const setHeader = (header: MenuGroup[]) => setDraft((d) => ({ ...d, menus: { ...d.menus, header } }));
  const setFooter = (footer: MenuColumn[]) => setDraft((d) => ({ ...d, menus: { ...d.menus, footer } }));

  async function save() {
    if (await send("PUT", SEO_API.layout, toPayload(draft), { done: "Layout saved", labels: layoutLabels(draft, t) })) setOpen(null);
  }

  const describe = (link: MenuLink) => {
    const page = link.target ? pageByTarget.get(link.target) : undefined;
    const name = pick(link.label, arabic) || (page ? pick(page.name, arabic) : "");
    const to = page ? page.path : link.url;
    return (
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{name || "—"}</span>
        {to ? <span dir="ltr" className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{to}</span> : null}
        {link.target && !page ? <Status tone="warn">Page not found</Status> : null}
      </span>
    );
  };

  const card = (key: Exclude<Open, null>, title: string, note: string, body: ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg"><T>{title}</T></CardTitle>
        {editable ? (
          <CardAction>
            <Button type="button" variant="outline" size="sm" aria-label={`${t("Edit")}: ${t(title)}`} onClick={() => edit(key)}>
              <Pencil aria-hidden="true" />
              <T>Edit</T>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <Note>{note}</Note>
        {body}
      </CardContent>
    </Card>
  );

  const buttons = (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button type="button" variant="gold" disabled={busy} onClick={save}><T>Save</T></Button>
      <Button type="button" variant="outline" onClick={() => setOpen(null)}><T>Cancel</T></Button>
    </div>
  );
  const add = (text: string, disabled: boolean, onClick: () => void) => (
    <div>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onClick}>
        <Plus aria-hidden="true" />
        <T>{text}</T>
      </Button>
    </div>
  );

  return (
    <div className="grid max-w-4xl gap-5">
      {card(
        "sections",
        "Home sections",
        "The order of the home page, top to bottom. A section with nothing to show today is left out by the website even when it is switched on.",
        <ol className="grid gap-2">
          {layout.home.order.map((section, i) => (
            <li key={section} className={ROW}>
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="font-medium">{sectionName(section)}</span>
                <span dir={arabic ? "ltr" : "rtl"} className="text-xs text-muted-foreground">{SECTION_NAMES[section][arabic ? 0 : 1]}</span>
              </span>
              <Status tone={layout.home.hidden.includes(section) ? "mute" : "ok"}>{layout.home.hidden.includes(section) ? "Hidden" : "Shown"}</Status>
            </li>
          ))}
        </ol>,
      )}
      {card(
        "popular",
        "Popular products",
        "Up to 8 products, in this order, first in the Popular products section. Empty: the website picks by itself, products in stock and featured first.",
        layout.home.popularIds.length === 0 ? (
          <p className="text-sm text-muted-foreground"><T>Automatic: nothing is picked.</T></p>
        ) : (
          <ol className="grid gap-2">
            {layout.home.popularIds.map((id, i) => (
              <li key={id} className={ROW}>
                <span className="flex items-baseline gap-2">
                  <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="font-medium">{productName(id)}</span>
                </span>
              </li>
            ))}
          </ol>
        ),
      )}
      {card(
        "header",
        "Header menu",
        "Up to 6 entries; an entry may open a dropdown of links. Empty: the website keeps its built-in menu.",
        layout.menus.header.length === 0 ? (
          <p className="text-sm text-muted-foreground"><T>Built-in menu: nothing is saved.</T></p>
        ) : (
          <ul className="grid gap-2">
            {layout.menus.header.map((group, i) => (
              <li key={i} className={`${ROW} items-start`}>
                <span className="grid min-w-0 gap-1">
                  {describe(group)}
                  {group.children.map((child, j) => (
                    <span key={j} className="ps-4 text-muted-foreground">{describe(child)}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ),
      )}
      {card(
        "footer",
        "Footer menu",
        "Up to 3 columns, each with a title and its links. Empty: the website keeps its built-in footer.",
        layout.menus.footer.length === 0 ? (
          <p className="text-sm text-muted-foreground"><T>Built-in footer: nothing is saved.</T></p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {layout.menus.footer.map((column, i) => (
              <div key={i} className="grid min-w-0 content-start gap-1 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                <strong>{pick(column.title, arabic) || "—"}</strong>
                {column.links.map((link, j) => (
                  <span key={j}>{describe(link)}</span>
                ))}
              </div>
            ))}
          </div>
        ),
      )}

      {open === "sections" ? (
        <Modal wide title="Home sections" description="Move a section up or down, and switch it on or off. The hero is always first and always shown." onClose={() => setOpen(null)}>
          <ol className="grid gap-2">
            {draft.home.order.map((section, i) => (
              <li key={section} className={ROW}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="font-medium">{sectionName(section)}</span>
                  {section === "hero" ? <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
                </span>
                <span className="flex items-center gap-3">
                  <Switch on={!draft.home.hidden.includes(section)} locked={section === "hero"} label={`${t("Show")}: ${sectionName(section)}`} onToggle={() => setHome({ hidden: toggleSection(draft.home.hidden, section) })} />
                  <RowTools what={sectionName(section)} index={i} count={draft.home.order.length} lock={1} onMove={(by) => setHome({ order: moveItem(draft.home.order, i, by, 1) })} />
                </span>
              </li>
            ))}
          </ol>
          {buttons}
        </Modal>
      ) : null}

      {open === "popular" ? (
        <Modal wide title="Popular products" description="Pick the products and put them in order. Leave the list empty for the automatic choice." onClose={() => setOpen(null)}>
          <ol className="grid gap-2">
            {draft.home.popularIds.map((id, i) => (
              <li key={id} className={ROW}>
                <span className="font-medium">{`${i + 1}. ${productName(id)}`}</span>
                <RowTools
                  what={productName(id)}
                  index={i}
                  count={draft.home.popularIds.length}
                  onMove={(by) => setHome({ popularIds: moveItem(draft.home.popularIds, i, by) })}
                  onRemove={() => setHome({ popularIds: draft.home.popularIds.filter((x) => x !== id) })}
                />
              </li>
            ))}
          </ol>
          {draft.home.popularIds.length >= POPULAR_MAX ? (
            <Note>The list is full. Remove a product to add another.</Note>
          ) : (
            <SelectField label={t("Add a product")} value="" onChange={(event) => event.target.value && setHome({ popularIds: addPopular(draft.home.popularIds, Number(event.target.value)) })}>
              <option value="">Choose a product…</option>
              {products
                .filter((p) => p.active && !draft.home.popularIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={String(p.id)}>{pick(p.name, arabic)}</option>
                ))}
            </SelectField>
          )}
          {buttons}
        </Modal>
      ) : null}

      {open === "header" ? (
        <Modal wide title="Header menu" description="Add entries in the order they show. An entry with links under it opens as a dropdown." onClose={() => setOpen(null)}>
          {draft.menus.header.map((group, i) => {
            const what = `${t("Menu entry")} ${i + 1}`;
            const setGroup = (next: MenuGroup) => setHeader(draft.menus.header.map((g, k) => (k === i ? next : g)));
            return (
              <div key={i} className="grid gap-3 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{what}</strong>
                  <RowTools what={what} index={i} count={draft.menus.header.length} onMove={(by) => setHeader(moveItem(draft.menus.header, i, by))} onRemove={() => setHeader(draft.menus.header.filter((_, k) => k !== i))} />
                </div>
                <LinkEditor link={group} pages={pages} parent={group.children.length > 0} onChange={(link) => setGroup({ ...link, children: group.children })} />
                {group.children.map((child, j) => (
                  <div key={j} className="grid gap-3 rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{`${t("Dropdown link")} ${j + 1}`}</span>
                      <RowTools
                        what={`${what}, ${t("link")} ${j + 1}`}
                        index={j}
                        count={group.children.length}
                        onMove={(by) => setGroup({ ...group, children: moveItem(group.children, j, by) })}
                        onRemove={() => setGroup({ ...group, children: group.children.filter((_, k) => k !== j) })}
                      />
                    </div>
                    <LinkEditor link={child} pages={pages} onChange={(link) => setGroup({ ...group, children: group.children.map((c, k) => (k === j ? link : c)) })} />
                  </div>
                ))}
                {add("Add a dropdown link", group.children.length >= CHILDREN_MAX, () => setGroup({ ...group, children: [...group.children, blankLink()] }))}
              </div>
            );
          })}
          {add("Add an entry", draft.menus.header.length >= HEADER_MAX, () => setHeader([...draft.menus.header, blankGroup()]))}
          {buttons}
        </Modal>
      ) : null}

      {open === "footer" ? (
        <Modal wide title="Footer menu" description="Up to 3 columns, each with a title and its links." onClose={() => setOpen(null)}>
          {draft.menus.footer.map((column, i) => {
            const what = `${t("Column")} ${i + 1}`;
            const setColumn = (next: MenuColumn) => setFooter(draft.menus.footer.map((c, k) => (k === i ? next : c)));
            return (
              <div key={i} className="grid gap-3 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{what}</strong>
                  <RowTools what={what} index={i} count={draft.menus.footer.length} onMove={(by) => setFooter(moveItem(draft.menus.footer, i, by))} onRemove={() => setFooter(draft.menus.footer.filter((_, k) => k !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label={t("Title (English)")} value={column.title.en} onChange={(event) => setColumn({ ...column, title: { ...column.title, en: event.target.value } })} />
                  <TextField label={t("Title (Arabic)")} dir="rtl" value={column.title.ar} onChange={(event) => setColumn({ ...column, title: { ...column.title, ar: event.target.value } })} />
                </div>
                {column.links.map((link, j) => (
                  <div key={j} className="grid gap-3 rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{`${t("Link")} ${j + 1}`}</span>
                      <RowTools
                        what={`${what}, ${t("link")} ${j + 1}`}
                        index={j}
                        count={column.links.length}
                        onMove={(by) => setColumn({ ...column, links: moveItem(column.links, j, by) })}
                        onRemove={() => setColumn({ ...column, links: column.links.filter((_, k) => k !== j) })}
                      />
                    </div>
                    <LinkEditor link={link} pages={pages} onChange={(next) => setColumn({ ...column, links: column.links.map((l, k) => (k === j ? next : l)) })} />
                  </div>
                ))}
                {add("Add a link", column.links.length >= COLUMN_LINKS_MAX, () => setColumn({ ...column, links: [...column.links, blankLink()] }))}
              </div>
            );
          })}
          {add("Add a column", draft.menus.footer.length >= COLUMNS_MAX, () => setFooter([...draft.menus.footer, blankColumn()]))}
          {buttons}
        </Modal>
      ) : null}
    </div>
  );
}
