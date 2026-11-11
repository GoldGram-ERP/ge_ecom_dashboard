import type { MetadataRoute } from "next";

// The admin panel is never for search engines (the layout also sends noindex).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
