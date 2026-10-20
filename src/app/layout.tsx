import type { Metadata, Viewport } from "next";
import { LangProvider } from "@/components/t";
import { isArabic } from "@/lib/api-server";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoldGram Admin",
  description: "GoldGram admin dashboard.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E1B32",
};

// The `EN / ع` switch is remembered in a cookie, so the server renders the page in the
// language and direction the administrator left it in.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const ar = await isArabic();
  return (
    <html lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"} className={fontVariables}>
      <body>
        <LangProvider ar={ar}>{children}</LangProvider>
      </body>
    </html>
  );
}
