"use client";

import { T } from "@/components/t";
import { type FormEvent, type ReactNode, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { Confirm } from "@/components/modal";
import { FormGrid, Note, SelectField, Status, TableCard, TextField } from "@/components/parts";
import { Switch } from "@/components/switch";
import { toast } from "@/components/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatStamp } from "@/lib/format";
import type { Administrator, Role } from "@/lib/types";
import { useSend } from "@/lib/use-send";

/** The built-in roles are stored in capitals; staff read them as words. */
export const roleLabel = (name: string) => (name === "SUPER_ADMIN" ? "Super admin" : name === "ADMIN" ? "Admin" : name);

// The seven permissions of SPEC section 3.8.
const PERMISSIONS: [string, string][] = [
  ["prices", "Set prices"],
  ["payments", "Verify payments"],
  ["kyc", "Approve KYC"],
  ["refunds", "Approve refunds"],
  ["settings", "Edit system settings"],
  ["catalog", "Manage catalog"],
  ["admins", "Manage administrators"],
];

const LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  password: "Password",
  roleId: "Role",
  permissions: "Permissions",
};

/** The administrators table. */
export function AdminsTable({ admins, roles }: { admins: Administrator[]; roles: Role[] }) {
  const { busy, send } = useSend();
  const [deleting, setDeleting] = useState<Administrator | null>(null);

  return (
    <TableCard>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col"><T>Administrator</T></TableHead>
            <TableHead scope="col"><T>Contact</T></TableHead>
            <TableHead scope="col"><T>Role</T></TableHead>
            <TableHead scope="col"><T>Status</T></TableHead>
            <TableHead scope="col"><T>Last login</T></TableHead>
            <TableHead scope="col">
              <span className="sr-only"><T>Actions</T></span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>
                <b className="font-medium">{admin.name}</b>
                <Note>{admin.nationality}</Note>
              </TableCell>
              <TableCell>
                {admin.email}
                <Note className="num">{admin.phone}</Note>
              </TableCell>
              <TableCell>
                <Select
                  // The server's answer decides what the select shows.
                  key={admin.roleId}
                  aria-label={`Role of ${admin.name}`}
                  defaultValue={admin.roleId ?? undefined}
                  className="w-48"
                  onChange={async (event) => {
                    const select = event.currentTarget;
                    const changed = await send(
                      "PATCH",
                      `/admin/admins/${admin.id}`,
                      { roleId: Number(select.value) },
                      { labels: LABELS },
                    );
                    if (!changed) select.value = String(admin.roleId);
                  }}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {roleLabel(role.name)}
                    </option>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <Status tone={admin.status === "Active" ? "ok" : admin.status === "Suspended" ? "bad" : "mute"}>
                  {admin.status}
                </Status>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground"><T>{formatStamp(admin.lastLoginAt)}</T></TableCell>
              <TableCell>
                {admin.roleName === "SUPER_ADMIN" ? null : (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        send("POST", `/admin/admins/${admin.id}/${admin.status === "Suspended" ? "activate" : "suspend"}`)
                      }
                    >
                      <T>{admin.status === "Suspended" ? "Activate" : "Suspend"}</T>
                    </Button>
                    <Button variant="destructive" size="sm" disabled={busy} onClick={() => setDeleting(admin)}>
                      <T>Delete</T>
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {deleting ? (
        <Confirm
          question={`Delete ${deleting.name}? Their access is removed permanently.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/admins/${deleting.id}`, undefined, { done: "Administrator deleted" });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </TableCard>
  );
}

/** "Permissions by role": one switch per permission and role; the SUPER_ADMIN column is locked. */
export function PermissionsTable({ roles, admins }: { roles: Role[]; admins: Administrator[] }) {
  const { busy, send } = useSend();
  const [deleting, setDeleting] = useState<Role | null>(null);

  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-lg"><T>Permissions by role</T></CardTitle>
        <CardDescription>
          <T>Money-handling steps are separated so no one role can set prices, verify payment and
          approve refunds alone.</T>
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col"><T>Permission</T></TableHead>
            {roles.map((role) => (
              <TableHead scope="col" key={role.id} className="whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  {roleLabel(role.name)}
                  {role.builtIn ? null : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete role ${role.name}`}
                      disabled={busy}
                      onClick={() => {
                        if (admins.some((admin) => admin.roleId === role.id)) {
                          toast("Reassign administrators with this role first");
                          return;
                        }
                        setDeleting(role);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSIONS.map(([key, label]) => (
            <TableRow key={key}>
              <TableCell className="font-medium whitespace-nowrap"><T>{label}</T></TableCell>
              {roles.map((role) => {
                const has = role.permissions.includes(key);
                return (
                  <TableCell key={role.id}>
                    <Switch
                      on={has}
                      label={`${label} for ${role.name}`}
                      locked={role.name === "SUPER_ADMIN"}
                      onToggle={() => {
                        if (busy) return;
                        send(
                          "PATCH",
                          `/admin/roles/${role.id}`,
                          {
                            permissions: has
                              ? role.permissions.filter((name) => name !== key)
                              : [...role.permissions, key],
                          },
                          { labels: LABELS },
                        );
                      }}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {deleting ? (
        <Confirm
          question={`Delete the role ${deleting.name}?`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            await send("DELETE", `/admin/roles/${deleting.id}`, undefined, {
              done: "Role deleted",
              refusals: { IN_USE: "Reassign administrators with this role first" },
            });
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </Card>
  );
}

/** "New role". */
export function NewRole({ roles }: { roles: Role[] }) {
  const { busy, send } = useSend();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name")).trim();
    if (!name) {
      toast("Name the role first");
      return;
    }
    if (roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
      toast("That role already exists");
      return;
    }
    const created = await send(
      "POST",
      "/admin/roles",
      { name, permissions: form.getAll("permission").map(String) },
      { done: "Role created", labels: LABELS },
    );
    if (created) formElement.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg"><T>New role</T></CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={create} noValidate className="grid gap-5">
          <TextField label="Role name" name="name" maxLength={40} className="max-w-sm" />
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"><T>Permissions</T></legend>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {PERMISSIONS.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox id={`np-${key}`} name="permission" value={key} />
                  <Label htmlFor={`np-${key}`} className="font-normal">
                    <T>{label}</T>
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
          <Button type="submit" variant="gold" disabled={busy} className="w-fit">
            <Plus />
            <T>Create role</T>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** "New administrator" (SPEC section 9, point 6). */
export function NewAdministrator({ roles }: { roles: Role[] }) {
  const { busy, send } = useSend();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (!name || !email || !password) {
      toast("Add a name, an email and a password");
      return;
    }
    const created = await send(
      "POST",
      "/admin/admins",
      { name, email, phone: String(form.get("phone")).trim(), password, roleId: Number(form.get("roleId")) },
      { done: "Administrator created", labels: LABELS },
    );
    if (created) formElement.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg"><T>New administrator</T></CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={create} noValidate className="grid gap-5">
          <FormGrid>
            <TextField label="Name" name="name" maxLength={80} autoComplete="off" />
            <TextField label="Email" name="email" type="email" maxLength={254} autoComplete="off" />
            <TextField label="Phone" name="phone" type="tel" maxLength={20} autoComplete="off" />
            <TextField label="Password" name="password" type="password" maxLength={128} autoComplete="new-password" />
            <SelectField label="Role" name="roleId">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabel(role.name)}
                </option>
              ))}
            </SelectField>
          </FormGrid>
          <Button type="submit" variant="gold" disabled={busy} className="w-fit">
            <Plus />
            <T>Create administrator</T>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** A form that stays out of the way until its button is pressed, as "Add product" does in the catalog. */
export function AddPanel({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex justify-end">
        <Button variant="gold" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Plus />}
          <T>{open ? "Close form" : label}</T>
        </Button>
      </div>
      {open ? children : null}
    </>
  );
}
