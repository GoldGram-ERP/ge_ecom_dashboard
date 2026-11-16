import { describe, expect, it } from "vitest";
import { descriptionForEditor, isHtmlDescription } from "./description";

describe("product descriptions: plain text or the editor's HTML", () => {
  it("tells the editor's HTML from plain text", () => {
    expect(isHtmlDescription("<p>A 24K bar.</p>")).toBe(true);
    expect(isHtmlDescription("Line one<br>two")).toBe(true);
    expect(isHtmlDescription("Weight < 5 g & purity > 99%")).toBe(false);
    expect(isHtmlDescription("")).toBe(false);
  });

  it("opens plain text in the editor as the paragraphs and line breaks it had", () => {
    expect(descriptionForEditor("Invest in gold.\n\nThe bar:\r\n- sealed\n- 24K & <999>")).toBe(
      "<p>Invest in gold.</p><p>The bar:<br>- sealed<br>- 24K &amp; &lt;999&gt;</p>",
    );
    expect(descriptionForEditor("One line")).toBe("<p>One line</p>");
    expect(descriptionForEditor("")).toBe("");
    expect(descriptionForEditor("  \n\n  ")).toBe("");
  });

  it("opens the editor's own HTML unchanged", () => {
    const html = '<h2>About</h2><p style="text-align: center">A <strong>24K</strong> bar</p>';
    expect(descriptionForEditor(html)).toBe(html);
  });
});
