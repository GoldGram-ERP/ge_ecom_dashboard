import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { xlsx } from "./xlsx";

/** Reads the stored files back out of the zip, checking each checksum against Node's own. */
function unzip(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer);
  const files: Record<string, string> = {};
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLength));
    const data = bytes.subarray(at + 30 + nameLength, at + 30 + nameLength + size);
    expect(view.getUint32(at + 14, true), name).toBe(crc32(data));
    files[name] = new TextDecoder().decode(data);
    at += 30 + nameLength + size;
  }
  // The central directory starts where the files end, and lists every one of them.
  expect(view.getUint32(at, true)).toBe(0x02014b50);
  expect(view.getUint16(bytes.length - 12, true)).toBe(Object.keys(files).length);
  expect(view.getUint32(bytes.length - 6, true)).toBe(at);
  return files;
}

describe("xlsx", () => {
  it("writes the five parts of a workbook, numbers as numbers and text escaped", () => {
    const files = unzip(xlsx([["Name", "الاسم", "Stock"], ["Bar <1 g> & co\u0001", "سبيكة ذهب", 20], ["AA", "", 0.25]]));
    expect(Object.keys(files)).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/worksheets/sheet1.xml"]);
    const sheet = files["xl/worksheets/sheet1.xml"];
    expect(sheet).toContain('<row r="2"><c r="A2" t="inlineStr"><is><t xml:space="preserve">Bar &lt;1 g&gt; &amp; co</t></is></c>');
    expect(sheet).toContain('<c r="B2" t="inlineStr"><is><t xml:space="preserve">سبيكة ذهب</t></is></c><c r="C2"><v>20</v></c></row>');
    expect(sheet).toContain('<c r="C3"><v>0.25</v></c>');
  });

  it("names columns past Z", () => {
    const row = Array.from({ length: 28 }, (_, index) => index);
    expect(unzip(xlsx([row]))["xl/worksheets/sheet1.xml"]).toContain('<c r="Z1"><v>25</v></c><c r="AA1"><v>26</v></c><c r="AB1"><v>27</v></c>');
  });
});
