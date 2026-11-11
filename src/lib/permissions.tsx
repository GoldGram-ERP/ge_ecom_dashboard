"use client";

import { createContext, type ReactNode, useContext } from "react";

interface Granted {
  all: boolean;
  set: ReadonlySet<string>;
}

const Permissions = createContext<Granted>({ all: false, set: new Set() });

/** Set once in the app layout from `/admin/auth/me`. The backend enforces; this only hides what would be refused. */
export function PermissionsProvider({
  superAdmin,
  permissions,
  children,
}: {
  superAdmin: boolean;
  permissions: string[];
  children: ReactNode;
}) {
  return <Permissions.Provider value={{ all: superAdmin, set: new Set(permissions) }}>{children}</Permissions.Provider>;
}

/** `const { can, canAny } = usePermissions()`; `can("orders:edit")`. SUPER_ADMIN can everything. */
export function usePermissions() {
  const { all, set } = useContext(Permissions);
  return {
    /** The role itself, for what only SUPER_ADMIN may touch whatever the permissions say (custom head code). */
    superAdmin: all,
    can: (permission: string) => all || set.has(permission),
    canAny: (permissions: string[]) => all || permissions.some((permission) => set.has(permission)),
  };
}

/** Renders its children only when the admin holds the permission. For Server Component pages. */
export function Can({ p, children }: { p: string; children: ReactNode }) {
  return usePermissions().can(p) ? children : null;
}
