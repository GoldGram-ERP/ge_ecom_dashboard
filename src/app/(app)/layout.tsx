import { T } from "@/components/t";
import { RetryButton } from "@/components/retry-button";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { PermissionsProvider } from "@/lib/permissions";
import { isArabic, serverGet } from "@/lib/api-server";
import type { AdminUser, PriceBoard } from "@/lib/types";

/** "Sara Adel" → "SA", as in the file's top bar. */
function initialsOf(user: AdminUser): string {
  const words = (user.name || user.email).trim().split(/\s+/);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}

// AC-20: every page in this group is behind this check. serverGet redirects to /login on 401.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ar = await isArabic();

  let user: AdminUser;
  let prices: PriceBoard | null;
  try {
    [{ user }, prices] = await Promise.all([
      serverGet<{ user: AdminUser }>("/admin/auth/me"),
      // The market pill: the same trading state the shop uses (switches, and market hours when enforced).
      serverGet<PriceBoard>("/prices").catch((error: unknown) => {
        if (error instanceof ApiError) return null;
        throw error;
      }),
    ]);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error; // the redirect to /login
    // The session check itself could not reach the backend (EC-15).
    return (
      <main className="mx-auto max-w-xl p-6">
        <Card role="alert">
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Could not load this page</T></CardTitle>
            <CardDescription>
              <T>Could not reach the server, so the dashboard cannot check who is signed in. Nothing
              was changed. Check that the server is running, then try again.</T>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetryButton />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <PermissionsProvider superAdmin={user.role === "SUPER_ADMIN"} permissions={user.permissions ?? []}>
    <Shell
      ar={ar}
      name={user.name || user.email}
      email={user.email}
      initials={initialsOf(user)}
      market={prices?.trading ?? null}
    >
      {children}
    </Shell>
    </PermissionsProvider>
  );
}
