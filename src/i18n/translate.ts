import { EXACT, PATTERNS } from "./ar";

/** JSX folds a text's line breaks and indentation into single spaces; the dictionary is keyed the same way. */
const fold = (text: string) => text.trim().replace(/\s+/g, " ");

/**
 * The Arabic for one piece of the dashboard's English wording. Anything that is not the
 * dashboard's own wording (a name, an email, a number, a reference) comes back unchanged.
 * A sentence with a changing part ("Edit Gold bar", "12 products exported") is matched by a
 * pattern; the changing parts are translated too when they are wording themselves.
 */
export function toArabic(text: string): string {
  const core = fold(text);
  if (core === "") return text;
  let arabic = EXACT[core];
  if (arabic === undefined) {
    for (const [test, make] of PATTERNS) {
      const match = test.exec(core);
      if (match) {
        arabic = typeof make === "string" ? core.replace(test, make) : make(match, toArabic);
        break;
      }
    }
  }
  if (arabic === undefined) return text;
  // The spaces around a text are part of the sentence it sits in ("Sent on " + a date).
  return (/^\s/.test(text) ? " " : "") + arabic + (/\s$/.test(text) ? " " : "");
}
