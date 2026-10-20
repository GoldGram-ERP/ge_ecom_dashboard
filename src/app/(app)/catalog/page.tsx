import { redirect } from "next/navigation";

// The catalog used to be one screen with four tabs; old links land on the first of the four screens.
export default function CatalogPage() {
  redirect("/catalog/categories");
}
