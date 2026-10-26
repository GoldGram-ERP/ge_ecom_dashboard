"use client";

import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Strikethrough, Underline as UnderlineIcon } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { T } from "@/components/t";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** `font-weight` as an inline style on the `<span>` TextStyle renders: the one inline style the server keeps. */
const FontWeight = Extension.create({
  name: "fontWeight",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight || null,
            renderHTML: (attributes) => (attributes.fontWeight ? { style: `font-weight: ${attributes.fontWeight}` } : {}),
          },
        },
      },
    ];
  },
});

const WEIGHTS: [string, string][] = [
  ["400", "Normal"],
  ["500", "Medium"],
  ["600", "Semibold"],
  ["700", "Bold"],
];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * A rich-text field whose value is an HTML string. A hidden input named `name` carries it into a form submit.
 * `onInsertImage` uploads the chosen file and returns the URL to insert; leave it out to disable the image button.
 */
export function RichTextEditor({
  label,
  name,
  value,
  onChange,
  dir = "ltr",
  onInsertImage,
  imageHint,
}: {
  label: string;
  name?: string;
  value: string;
  onChange?: (html: string) => void;
  dir?: "ltr" | "rtl";
  onInsertImage?: (file: File) => Promise<string | null>;
  imageHint?: string;
}) {
  const [html, setHtml] = useState(value);
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    content: value,
    // StarterKit 3 already carries underline and link.
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      TextStyle,
      FontWeight,
      Image,
    ],
    editorProps: {
      attributes: {
        dir,
        class: "min-h-40 max-h-96 overflow-y-auto rounded-b-lg px-2.5 py-2 text-sm leading-relaxed outline-none [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_img]:max-w-full [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-5 [&_ol]:ps-5",
      },
    },
    onUpdate: ({ editor: e }) => {
      const next = e.isEmpty ? "" : e.getHTML();
      setHtml(next);
      onChange?.(next);
    },
  });

  if (!editor) return <div className="grid gap-1.5"><Label>{label}</Label><div className="min-h-40 rounded-lg border border-input bg-card" /></div>;

  const weight = String(editor.getAttributes("textStyle").fontWeight ?? "400");

  function tool(title: string, icon: ReactNode, active: boolean, run: () => void, disabled = false) {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        onClick={run}
        className={cn("grid size-7 place-items-center rounded-md hover:bg-muted disabled:opacity-40 [&_svg]:size-4", active && "bg-muted text-primary")}
      >
        {icon}
      </button>
    );
  }

  const ed = editor;
  const chain = () => ed.chain().focus();

  function setLink() {
    const current = ed.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address", current ?? "https://");
    if (url === null) return;
    if (url.trim() === "") chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function pick(file: File | undefined) {
    if (!file || !onInsertImage) return;
    setUploading(true);
    try {
      const src = await onInsertImage(file);
      if (src) chain().setImage({ src }).run();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {name ? <input type="hidden" name={name} value={html} /> : null}
      <div className="rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1" dir="ltr">
          {tool("Bold", <Bold />, editor.isActive("bold"), () => chain().toggleBold().run())}
          {tool("Italic", <Italic />, editor.isActive("italic"), () => chain().toggleItalic().run())}
          {tool("Underline", <UnderlineIcon />, editor.isActive("underline"), () => chain().toggleUnderline().run())}
          {tool("Strikethrough", <Strikethrough />, editor.isActive("strike"), () => chain().toggleStrike().run())}
          {tool("Heading 2", <Heading2 />, editor.isActive("heading", { level: 2 }), () => chain().toggleHeading({ level: 2 }).run())}
          {tool("Heading 3", <Heading3 />, editor.isActive("heading", { level: 3 }), () => chain().toggleHeading({ level: 3 }).run())}
          {tool("Bullet list", <List />, editor.isActive("bulletList"), () => chain().toggleBulletList().run())}
          {tool("Numbered list", <ListOrdered />, editor.isActive("orderedList"), () => chain().toggleOrderedList().run())}
          {tool("Align left", <AlignLeft />, editor.isActive({ textAlign: "left" }), () => chain().setTextAlign("left").run())}
          {tool("Align center", <AlignCenter />, editor.isActive({ textAlign: "center" }), () => chain().setTextAlign("center").run())}
          {tool("Align right", <AlignRight />, editor.isActive({ textAlign: "right" }), () => chain().setTextAlign("right").run())}
          {tool("Link", <Link2 />, editor.isActive("link"), setLink)}
          <select
            aria-label="Font weight"
            value={WEIGHTS.some(([w]) => w === weight) ? weight : "400"}
            onChange={(event) => {
              const w = event.target.value;
              if (w === "400") chain().setMark("textStyle", { fontWeight: null }).removeEmptyTextStyle().run();
              else chain().setMark("textStyle", { fontWeight: w }).run();
            }}
            className="h-7 rounded-md border border-input bg-card px-1 text-xs"
          >
            {WEIGHTS.map(([w, text]) => (
              <option key={w} value={w}>{text} {w}</option>
            ))}
          </select>
          {tool(onInsertImage ? "Insert image" : "Save the article first, then add images", <ImagePlus />, false, () => picker.current?.click(), !onInsertImage || uploading)}
          <input ref={picker} type="file" accept={IMAGE_TYPES.join(",")} hidden tabIndex={-1} aria-hidden="true" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void pick(file); }} />
        </div>
        <EditorContent editor={editor} />
      </div>
      {!onInsertImage && imageHint ? <p className="text-xs text-muted-foreground"><T>{imageHint}</T></p> : null}
    </div>
  );
}
