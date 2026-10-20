// A real Excel file (.xlsx) from rows of cells, with no library: an .xlsx is a zip of five
// small XML files. shortcut: one sheet, no styles, stored without compression; take a
// library when a sheet needs formatting, formulas or more than a few thousand rows.

/** Text, or a number Excel can sum. */
export type Cell = string | number;

const NS = "http://schemas.openxmlformats.org";
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Escapes text for XML and drops the control characters XML cannot hold. */
const xml = (text: string) =>
  text
    .replace(/[^\x09\x0A\x0D\x20-�]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** 0 → A, 25 → Z, 26 → AA. */
function column(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function sheet(rows: Cell[][]): string {
  const body = rows
    .map((row, r) => {
      const cells = row.map((cell, c) => {
        const at = `${column(c)}${r + 1}`;
        return typeof cell === "number" && Number.isFinite(cell)
          ? `<c r="${at}"><v>${cell}</v></c>`
          : `<c r="${at}" t="inlineStr"><is><t xml:space="preserve">${xml(String(cell))}</t></is></c>`;
      });
      return `<row r="${r + 1}">${cells.join("")}</row>`;
    })
    .join("");
  return `${HEAD}<worksheet xmlns="${NS}/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/** Little-endian fields: `[value, bytes]` pairs, as the zip format writes them. */
function fields(...pairs: [value: number, size: 2 | 4][]): Uint8Array {
  const view = new DataView(new ArrayBuffer(pairs.reduce((sum, [, size]) => sum + size, 0)));
  let at = 0;
  for (const [value, size] of pairs) {
    if (size === 2) view.setUint16(at, value, true);
    else view.setUint32(at, value, true);
    at += size;
  }
  return new Uint8Array(view.buffer);
}

/** A zip whose files are stored as they are (method 0). */
function zip(files: [name: string, text: string][]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(text);
    // version 2.0, no flags, stored, midnight, 1 January 1980, checksum, both sizes, name length, no extra field
    const shared = fields([20, 2], [0, 2], [0, 2], [0, 2], [0x21, 2], [crc32(data), 4], [data.length, 4], [data.length, 4], [nameBytes.length, 2], [0, 2]);
    const local = concat([fields([0x04034b50, 4]), shared, nameBytes, data]);
    locals.push(local);
    // …then: no comment, disk 0, no attributes, where the file starts
    central.push(concat([fields([0x02014b50, 4], [20, 2]), shared, fields([0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]), nameBytes]));
    offset += local.length;
  }
  const directory = concat(central);
  const end = fields([0x06054b50, 4], [0, 2], [0, 2], [files.length, 2], [files.length, 2], [directory.length, 4], [offset, 4], [0, 2]);
  return concat([...locals, directory, end]);
}

/** The bytes of an .xlsx with one sheet. The first row is usually the headings. */
export function xlsx(rows: Cell[][]): Uint8Array<ArrayBuffer> {
  const rels = (target: string, type: string) =>
    `${HEAD}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/${type}" Target="${target}"/></Relationships>`;
  return zip([
    [
      "[Content_Types].xml",
      `${HEAD}<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    ],
    ["_rels/.rels", rels("xl/workbook.xml", "officeDocument")],
    [
      "xl/workbook.xml",
      `${HEAD}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    ["xl/_rels/workbook.xml.rels", rels("worksheets/sheet1.xml", "worksheet")],
    ["xl/worksheets/sheet1.xml", sheet(rows)],
  ]);
}

/** Saves the rows as an Excel file through the browser's own download. */
export function downloadXlsx(fileName: string, rows: Cell[][]): void {
  const url = URL.createObjectURL(new Blob([xlsx(rows)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // The download has its own copy by then.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
