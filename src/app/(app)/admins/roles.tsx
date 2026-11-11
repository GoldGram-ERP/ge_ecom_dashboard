"use client";

import { T } from "@/components/t";
import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox";
import { Confirm, Modal } from "@/components/modal";
import { Note, Status, TableCard, TextAreaField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/lib/permissions";
import type { Administrator, Role } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { roleLabel } from "./admin-parts";

// The permission matrix as data (spec section 3): module -> screens -> the actions that exist for
// that screen. A new screen is one line in MODULES.
type Action = [action: string, label: string];
const CRUD: Action[] = [["view", "View"], ["add", "Add"], ["edit", "Edit"], ["delete", "Delete"]];
const VIEW: Action[] = [["view", "View"]];
const screen = (key: string, label: string, actions: Action[] = CRUD) => ({ key, label, actions });
const MODULES = [
  { name: "Overview", screens: [screen("dashboard", "Dashboard", VIEW)] },
  { name: "Pricing", screens: [screen("prices", "Gold & silver prices", [["view", "View"], ["update", "Update"]])] },
  {
    name: "Orders",
    screens: [
      screen("orders", "Orders", [...CRUD, ["status", "Change status"], ["refund", "Refund"]]),
      screen("sell_requests", "Sell requests", [["view", "View"], ["approve", "Approve"]]),
    ],
  },
  { name: "Customers", screens: [screen("customers", "Customers")] },
  {
    name: "Product management",
    screens: [
      screen("categories", "Categories"),
      screen("product_types", "Product types"),
      screen("manufacturers", "Manufacturers"),
      screen("products", "Products"),
      screen("cashback", "Cashback policies"),
      screen("discount_rules", "Discount rules"),
    ],
  },
  { name: "User management", screens: [screen("admins", "Administrators & roles")] },
  { name: "Payments", screens: [screen("payment_methods", "Payment methods")] },
  { name: "Geography", screens: [screen("geography", "Zones & branches")] },
  {
    name: "Settings",
    screens: [
      screen("settings", "System settings"),
      screen("site_texts", "Website texts"),
      screen("articles", "Articles"),
      screen("faq", "FAQ"),
    ],
  },
  { name: "SEO", screens: [screen("seo", "SEO panel", [["view", "View"], ["edit", "Edit"]])] },
  { name: "System", screens: [screen("logs", "System logs", VIEW)] },
];

const keysOf = (s: { key: string; actions: Action[] }) => s.actions.map(([action]) => `${s.key}:${action}`);
const ALL = MODULES.flatMap((m) => m.screens.flatMap(keysOf));

/** checked / unchecked / indeterminate for a group of permission keys. */
function stateOf(keys: string[], chosen: Set<string>): boolean | "indeterminate" {
  const n = keys.filter((key) => chosen.has(key)).length;
  return n === 0 ? false : n === keys.length ? true : "indeterminate";
}

const LABELS = { name: "Name", description: "Description", permissions: "Permissions" };

function RoleEditor({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const { busy, send } = useSend();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [chosen, setChosen] = useState(() => new Set(role?.permissions ?? []));
  const [closed, setClosed] = useState<Set<string>>(new Set());

  function set(keys: string[], on: boolean) {
    const next = new Set(chosen);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    setChosen(next);
  }
  // A click on a mixed group checks all of it; on a full group, clears it.
  const toggle = (keys: string[]) => set(keys, stateOf(keys, chosen) !== true);

  async function save() {
    if (!name.trim()) {
      toast("Name the role first");
      return;
    }
    const body = { name: name.trim(), description: description.trim(), permissions: ALL.filter((key) => chosen.has(key)) };
    const saved = role
      ? await send("PATCH", `/admin/roles/${role.id}`, body, { done: "Role saved", labels: LABELS })
      : await send("POST", "/admin/roles", body, { done: "Role created", labels: LABELS });
    if (saved) onClose();
  }

  return (
    <Modal title={role ? `Edit role ${role.name}` : "New role"} wide onClose={onClose}>
      <div className="grid gap-4">
        <TextField label="Role name" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
        <TextAreaField label="Description" maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
        <div className="flex items-center gap-2 border-b pb-3">
          <Checkbox id="perm-all" checked={stateOf(ALL, chosen)} onCheckedChange={() => toggle(ALL)} />
          <Label htmlFor="perm-all" className="font-medium"><T>Select all</T></Label>
        </div>
        {MODULES.map((module) => {
          const moduleKeys = module.screens.flatMap(keysOf);
          const open = !closed.has(module.name);
          return (
            <section key={module.name} className="grid gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-expanded={open}
                  aria-label={`${open ? "Collapse" : "Expand"} ${module.name}`}
                  onClick={() => {
                    const next = new Set(closed);
                    if (open) next.add(module.name);
                    else next.delete(module.name);
                    setClosed(next);
                  }}
                >
                  {open ? <ChevronDown /> : <ChevronRight />}
                </Button>
                <Checkbox id={`perm-m-${module.name}`} checked={stateOf(moduleKeys, chosen)} onCheckedChange={() => toggle(moduleKeys)} />
                <Label htmlFor={`perm-m-${module.name}`} className="font-heading text-base"><T>{module.name}</T></Label>
              </div>
              {open
                ? module.screens.map((s) => {
                    const keys = keysOf(s);
                    return (
                      <div key={s.key} className="grid gap-1.5 border-t pt-2 ps-9">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          <span className="min-w-44 text-sm font-medium"><T>{s.label}</T></span>
                          <div className="flex items-center gap-2">
                            <Checkbox id={`perm-s-${s.key}`} checked={stateOf(keys, chosen)} onCheckedChange={() => toggle(keys)} />
                            <Label htmlFor={`perm-s-${s.key}`} className="font-normal text-muted-foreground"><T>All</T></Label>
                          </div>
                          {s.actions.map(([action, label]) => (
                            <div key={action} className="flex items-center gap-2">
                              <Checkbox
                                id={`perm-${s.key}-${action}`}
                                checked={chosen.has(`${s.key}:${action}`)}
                                onCheckedChange={(on) => set([`${s.key}:${action}`], on === true)}
                              />
                              <Label htmlFor={`perm-${s.key}-${action}`} className="font-normal"><T>{label}</T></Label>
                            </div>
                          ))}
                        </div>
                        {!chosen.has(`${s.key}:view`) && keys.some((key) => chosen.has(key)) ? (
                          <Note>Without View, this screen is hidden from the menu even if other actions are checked.</Note>
                        ) : null}
                      </div>
                    );
                  })
                : null}
            </section>
          );
        })}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}><T>Cancel</T></Button>
          <Button type="button" variant="gold" disabled={busy} onClick={save}><T>Save role</T></Button>
        </div>
      </div>
    </Modal>
  );
}

/** The roles tab: list, create, edit, delete. SUPER_ADMIN is shown but never changed. */
export function RoleManager({ roles, admins }: { roles: Role[]; admins: Administrator[] }) {
  const { busy, send } = useSend();
  const { can } = usePermissions();
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  return (
    <>
      {can("admins:add") ? (
        <div className="flex justify-end">
          <Button variant="gold" onClick={() => setEditing("new")}>
            <Plus />
            <T>New role</T>
          </Button>
        </div>
      ) : null}
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Role</T></TableHead>
              <TableHead scope="col"><T>Description</T></TableHead>
              <TableHead scope="col"><T>Permissions</T></TableHead>
              <TableHead scope="col"><span className="sr-only"><T>Actions</T></span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => {
              const locked = role.name === "SUPER_ADMIN";
              return (
                <TableRow key={role.id}>
                  <TableCell className="whitespace-nowrap">
                    <b className="font-medium">{roleLabel(role.name)}</b>{" "}
                    {role.builtIn ? <Status tone="info">Built-in</Status> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description}</TableCell>
                  <TableCell className="num">{locked ? <T>All</T> : `${role.permissions.length} / ${ALL.length}`}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!locked && can("admins:edit") ? (
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setEditing(role)}>
                          <Pencil />
                          <T>Edit</T>
                        </Button>
                      ) : null}
                      {!role.builtIn && can("admins:delete") ? (
                        <Button
                          variant="destructive"
                          size="sm"
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
                          <T>Delete</T>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>
      {editing ? (
        <RoleEditor key={editing === "new" ? "new" : editing.id} role={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
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
    </>
  );
}
