import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import { type Saved, TextsTable } from "./texts-table";

/** Where the storefront runs: it lists its own built-in wording at /site-texts. */
const SHOP_URL = (process.env.SHOP_URL ?? "http://localhost:3100").replace(/\/+$/, "");

async function builtIn(): Promise<{ en: Record<string, string>; ar: Record<string, string> } | null> {
  try {
    const response = await fetch(`${SHOP_URL}/site-texts`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

// Every text of the website, in English and Arabic, with the ones an administrator rewrote.
export default async function SiteTextsPage() {
  const [defaults, saved] = await Promise.all([builtIn(), serverGet<Saved>("/site-texts")]);

  return (
    <>
      <Intro>
        <T>Every text of the website, in English and Arabic. Rewrite one and the website shows it
        within half a minute; restore it and the built-in wording comes back.</T>
      </Intro>
      {defaults ? (
        <TextsTable defaults={defaults} saved={saved} />
      ) : (
        <p className="text-sm text-muted-foreground">
          <T>The website did not answer at</T> {SHOP_URL}<T>, so its texts cannot be listed. Start it, or set SHOP_URL to its
          address, and reload.</T>
        </p>
      )}
    </>
  );
}
