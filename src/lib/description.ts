// A product description is either plain text (every one written before the editor) or the HTML
// the editor saves, which the server cleans before it stores it.

const TAG = /<\/?[a-z][a-z0-9]*(\s[^<>]*)?\/?>/i;

/** True for a description written in the editor: it holds at least one HTML tag. */
export function isHtmlDescription(text: string): boolean {
  return TAG.test(text);
}

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * What the editor opens with. HTML is passed as it is. Plain text becomes paragraphs: a blank
 * line starts a new one and a single line break stays a line break, so it reads as it did.
 */
export function descriptionForEditor(text: string): string {
  if (isHtmlDescription(text)) return text;
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}
