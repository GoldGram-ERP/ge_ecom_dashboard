import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { toArabic } from "./translate";

// "100% Arabic" as a test: every piece of wording written in the dashboard's source must come
// out of the dictionary changed. It reads the source the way the screens are written:
// text and `{…}` inside <T>, the attributes people read or hear, toast()/t() messages, the
// `label:`-like fields of objects, and any other string that looks like a sentence or a title.
// COVERAGE_DUMP=<file> writes what is missing to a file, for whoever is translating.

const SRC = join(__dirname, "..");
const SKIP_DIRS = [
  "components" + sep + "ui",
  "components" + sep + "animate-ui",
  "i18n",
  "hooks",
];
const READ_ATTRIBUTES = new Set([
  "label",
  "title",
  "description",
  "placeholder",
  "aria-label",
  "question",
  "confirmLabel",
  "note",
  "yes",
  "no",
  "text",
  "submitLabel",
  "alt",
]);
const READ_FIELDS = new Set([
  "label",
  "note",
  "done",
  "hint",
  "title",
  "description",
  "text",
  "question",
  "confirmLabel",
]);
const MESSAGE_CALLS = new Set(["toast", "t", "wording"]);
// Calls whose strings are addresses, class names or code, never wording.
const CODE_CALLS = new Set([
  "cn",
  "cva",
  "clsx",
  "api",
  "send",
  "serverGet",
  "serverGetOrNull",
  "serverList",
  "buildHref",
  "redirect",
  "fetch",
  "push",
  "replace",
  "replaceAll",
  "startsWith",
  "endsWith",
  "includes",
  "test",
  "split",
  "join",
  "get",
  "set",
  "append",
  "has",
  "getByRole",
  "closest",
  "querySelector",
  "Error",
  "RegExp",
  "DateTimeFormat",
  "toLocaleString",
  "createElement",
  "setAttribute",
  "dynamic",
  "require",
  "import",
  "slice",
  "indexOf",
  "localeCompare",
  "padStart",
  "downloadXlsx",
]);
/** Latin that stays Latin in Arabic too: the brand, units of code, formats. */
const KEEP = new Set([
  "INVALID_TRANSITION",
  "GoldGram",
  "EN",
  "YYYY-MM-DD",
  "ID",
  "X9",
  "JPEG, PNG",
  "WebP",
  "KYC",
  "Ag 999",
  // The language switch names its target in that language, so it is found by someone who cannot read the other.
  "Switch to English",
]);

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.some((skip) => full.endsWith(skip))) files(full, out);
    } else if (
      /\.tsx?$/.test(name) &&
      !/\.test\.|types\.ts$|\.d\.ts$/.test(name)
    )
      out.push(full);
  }
  return out;
}

const fold = (text: string) => text.trim().replace(/\s+/g, " ");
const entities = (text: string) =>
  text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
const hasWords = (text: string) => /[A-Za-z]{2}/.test(text.replace(/X9/g, ""));
/** A title ("Save item") or a sentence ("Give the item a name"), not a token, a path or a class list. */
const looksLikeWording = (text: string) =>
  !/^[/#.[]|[[\]{}<>=]|^[A-Z0-9_]+$|^[a-z0-9_-]+$|^[a-z]+:|:[a-z-]+\b|\.(png|svg|tsx?|js)$|(^| )(flex|grid|text-|bg-|px-|py-|gap-|items-|justify-|rounded|ring-|border|font-|size-|shrink)/.test(
    text,
  ) &&
  (/^[A-Z][a-z]+([ ,.:!?…]|$)/.test(text) ||
    /[A-Za-z]{2,} [a-z]{2,}/.test(text));

/** A template's text with each `${…}` as the stand-in X9: `Edit ${name}` → `Edit X9`. */
function sampleOf(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isTemplateExpression(node))
    return (
      node.head.text +
      node.templateSpans.map((span) => "X9" + span.literal.text).join("")
    );
  return null;
}

const calleeName = (call: ts.CallExpression | ts.NewExpression) => {
  const callee = call.expression;
  return ts.isPropertyAccessExpression(callee)
    ? callee.name.text
    : callee.getText();
};

/** Whether a string sits where only code reads it. */
function isCode(node: ts.Node): boolean {
  const parent = node.parent;
  if (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isLiteralTypeNode(parent) ||
    ts.isExpressionStatement(parent)
  )
    return true;
  if (
    ts.isBinaryExpression(parent) &&
    /^[=!]==?$/.test(parent.operatorToken.getText())
  )
    return true;
  if (
    ts.isCaseClause(parent) ||
    ts.isElementAccessExpression(parent) ||
    ts.isTypeOfExpression(parent)
  )
    return true;
  if (
    (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) &&
    parent.name === node
  )
    return true;
  if (ts.isJsxAttribute(parent))
    return !READ_ATTRIBUTES.has(parent.name.getText());
  // An argument of a code call, directly or as one side of a choice: `send(editing ? "PATCH" : "POST", …)`.
  let top: ts.Node = node;
  while (
    ts.isConditionalExpression(top.parent) ||
    ts.isParenthesizedExpression(top.parent) ||
    ts.isBinaryExpression(top.parent)
  )
    top = top.parent;
  const call = top.parent;
  if (
    (ts.isCallExpression(call) || ts.isNewExpression(call)) &&
    CODE_CALLS.has(calleeName(call))
  )
    return true;
  for (let up: ts.Node = parent; up && !ts.isSourceFile(up); up = up.parent) {
    if (ts.isJsxAttribute(up)) return !READ_ATTRIBUTES.has(up.name.getText());
    if (
      (ts.isCallExpression(up) || ts.isNewExpression(up)) &&
      ["cn", "cva", "clsx"].includes(calleeName(up))
    )
      return true;
    if (ts.isJsxElement(up) || ts.isFunctionLike(up)) break;
  }
  return false;
}

/** Where a string is certainly wording, however it looks. */
function isRead(node: ts.Node): boolean {
  for (
    let up: ts.Node = node.parent;
    up && !ts.isSourceFile(up);
    up = up.parent
  ) {
    if (ts.isJsxElement(up)) return up.openingElement.tagName.getText() === "T";
    if (ts.isJsxAttribute(up)) return READ_ATTRIBUTES.has(up.name.getText());
    if (ts.isCallExpression(up) && MESSAGE_CALLS.has(calleeName(up)))
      return true;
    if (ts.isPropertyAssignment(up) && READ_FIELDS.has(up.name.getText()))
      return true;
    if (ts.isFunctionLike(up)) return false;
  }
  return false;
}

function wordingOf(file: string): string[] {
  const tree = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  (function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const parent = node.parent;
      const tag = ts.isJsxElement(parent)
        ? parent.openingElement.tagName.getText()
        : "";
      const text = fold(entities(node.text));
      if (hasWords(text) && tag !== "option" && tag !== "style")
        found.push(text);
    } else {
      const sample = sampleOf(node);
      if (sample !== null) {
        const text = fold(sample);
        if (
          hasWords(text) &&
          !isCode(node) &&
          (isRead(node) || looksLikeWording(text))
        )
          found.push(text);
        if (ts.isTemplateExpression(node))
          node.templateSpans.forEach((span) => visit(span.expression));
        return;
      }
    }
    ts.forEachChild(node, visit);
  })(tree);
  return found;
}

describe("Arabic coverage of the dashboard", () => {
  it("has Arabic for every piece of wording in the source", () => {
    const missing: Record<string, string[]> = {};
    let total = 0;
    for (const file of files(SRC)) {
      for (const text of new Set(wordingOf(file))) {
        total++;
        if (KEEP.has(text) || toArabic(text) !== text) continue;
        (missing[relative(SRC, file).split(sep).join("/")] ??= []).push(text);
      }
    }
    if (process.env.COVERAGE_DUMP)
      writeFileSync(
        process.env.COVERAGE_DUMP,
        JSON.stringify(missing, null, 1),
      );
    expect(total).toBeGreaterThan(400);
    expect(missing).toEqual({});
  });

  it("leaves what is not wording alone, and keeps the spaces a sentence needs around its parts", () => {
    expect(toArabic("volta.work07@gmail.com")).toBe("volta.work07@gmail.com");
    expect(toArabic("GG-378087")).toBe("GG-378087");
    expect(toArabic(" Cancel ")).toMatch(/^ \S.*\S $/);
  });
});
