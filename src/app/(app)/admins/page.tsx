import { T } from "@/components/t";
import { CountCards } from "@/components/count-cards";
import { Intro, LinkTabs } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import { buildHref, firstParam } from "@/lib/query";
import type { Administrator, Role } from "@/lib/types";
import { AddPanel, AdminsTable, NewAdministrator, NewRole, PermissionsTable } from "./admin-parts";

// Administrators and roles (AC-28), as two tabs: who can sign in, and what each role may do.
// Each tab has one job and one "add" button, like the catalog.
export default async function AdminsPage(props: PageProps<"/admins">) {
  const raw = await props.searchParams;
  const tab = firstParam(raw.tab) === "roles" ? "roles" : "admins";
  const f = firstParam(raw.f);
  const filter = f === "Active" || f === "Inactive" || f === "Suspended" ? f : "all";
  const [admins, roles] = await Promise.all([
    serverGet<Administrator[]>("/admin/admins"),
    serverGet<Role[]>("/admin/roles"),
  ]);
  const count = (status: string) => admins.filter((admin) => admin.status === status).length;
  const here = (key: string) => buildHref("/admins", { f: key });

  return (
    <>
      <Intro>
        <T>Who can sign in to this dashboard, and what each role may do. Money-handling steps are split
        across roles on purpose.</T>
      </Intro>
      <LinkTabs
        current={tab}
        items={[
          { key: "admins", label: `Administrators (${admins.length})`, href: "/admins" },
          { key: "roles", label: `Roles (${roles.length})`, href: "/admins?tab=roles" },
        ]}
      />
      {tab === "admins" ? (
        <>
          <AddPanel key="administrator" label="Add administrator">
            <NewAdministrator roles={roles} />
          </AddPanel>
          <CountCards
            current={filter}
            cards={[
              { key: "all", label: "Total", count: admins.length, note: "Administrators", href: here("") },
              { key: "Active", label: "Active", count: count("Active"), note: "Can sign in", href: here("Active") },
              { key: "Inactive", label: "Inactive", count: count("Inactive"), note: "Not in use", href: here("Inactive") },
              { key: "Suspended", label: "Suspended", count: count("Suspended"), note: "Blocked", href: here("Suspended") },
            ]}
          />
          <AdminsTable
            admins={filter === "all" ? admins : admins.filter((admin) => admin.status === filter)}
            roles={roles}
          />
        </>
      ) : (
        <>
          <AddPanel key="role" label="New role">
            <NewRole roles={roles} />
          </AddPanel>
          <PermissionsTable roles={roles} admins={admins} />
        </>
      )}
    </>
  );
}
