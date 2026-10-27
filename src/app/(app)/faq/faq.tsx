"use client";

import { T } from "@/components/t";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { isRowClick } from "@/components/link-row";
import { Confirm, Modal } from "@/components/modal";
import { EmptyRow, FormGrid, SelectField, Status, TableCard, TextAreaField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminFaqItem } from "@/lib/types";
import { useSend } from "@/lib/use-send";
import { usePermissions } from "@/lib/permissions";

const LABELS = {
  questionEn: "Question (EN)",
  questionAr: "السؤال (AR)",
  answerEn: "Answer (EN)",
  answerAr: "الإجابة (AR)",
  sortOrder: "Sort order",
};

/** The FAQ screen. A row opens the item's dialog; values change only in that dialog. */
export function Faq({ items }: { items: AdminFaqItem[] }) {
  const { busy, send } = useSend();
  const { can } = usePermissions();
  // `null` is closed, `"new"` is the create form; an item is held by id so it shows what the server holds.
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminFaqItem | null>(null);
  const editing = typeof open === "number" ? (items.find((item) => item.id === open) ?? null) : null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const sortOrder = Number(text("sortOrder") || 0);
    if (!text("questionEn") || !text("questionAr") || !text("answerEn") || !text("answerAr")) {
      toast("Fill in the question and answer in both languages");
      return;
    }
    if (!Number.isInteger(sortOrder)) {
      toast("Sort order must be a whole number");
      return;
    }
    const body = {
      questionEn: text("questionEn"),
      questionAr: text("questionAr"),
      answerEn: text("answerEn"),
      answerAr: text("answerAr"),
      active: text("active") === "1",
      sortOrder,
    };
    const done = await send(
      editing ? "PATCH" : "POST",
      editing ? `/admin/faq/${editing.id}` : "/admin/faq",
      body,
      { done: editing ? "Question saved" : "Question added", labels: LABELS },
    );
    if (done) setOpen(null);
  }

  return (
    <>
      <div className="flex justify-end">
        {can("faq:add") ? (
        <Button type="button" variant="gold" onClick={() => setOpen("new")}>
          <Plus aria-hidden="true" />
          <T>Create new</T>
        </Button>
        ) : null}
      </div>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Question (EN / AR)</T></TableHead>
              <TableHead scope="col"><T>Sort order</T></TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
              <TableHead scope="col">
                <span className="sr-only"><T>Actions</T></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <EmptyRow colSpan={4}><T>No questions yet.</T></EmptyRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (isRowClick(event)) setOpen(item.id);
                  }}
                >
                  <TableCell className="whitespace-normal">
                    <Button type="button" variant="link" className="h-auto p-0 text-start font-medium text-foreground" aria-label={`Open ${item.questionEn}`} onClick={() => setOpen(item.id)}>
                      {item.questionEn}
                    </Button>
                    <small dir="rtl" className="block text-xs text-muted-foreground">{item.questionAr}</small>
                  </TableCell>
                  <TableCell className="num">{item.sortOrder}</TableCell>
                  <TableCell>
                    <Status tone={item.active ? "ok" : "mute"}><T>{item.active ? "Active" : "Inactive"}</T></Status>
                  </TableCell>
                  <TableCell className="text-end">
                    {can("faq:edit") ? (
                    <Button type="button" variant="outline" className="bg-card" aria-label={`Edit ${item.questionEn}`} onClick={() => setOpen(item.id)}>
                      <Pencil aria-hidden="true" />
                      <T>Edit</T>
                    </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
      {open === "new" || editing ? (
        <Modal
          wide
          title={editing ? "Edit question" : "New question"}
          onClose={() => setOpen(null)}
          actions={
            editing && can("faq:delete") ? (
              <Button type="button" variant="outline" size="sm" className="bg-card text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => setDeleting(editing)}>
                <Trash2 aria-hidden="true" />
                <T>Delete</T>
              </Button>
            ) : undefined
          }
        >
          <form key={editing?.id ?? "new"} className="grid gap-4" onSubmit={save} noValidate>
            <FormGrid className="lg:grid-cols-2">
              <TextField label="Question (EN)" name="questionEn" defaultValue={editing?.questionEn} type="text" />
              <TextField label="السؤال (AR)" name="questionAr" defaultValue={editing?.questionAr} type="text" dir="rtl" />
              <TextAreaField label="Answer (EN)" name="answerEn" defaultValue={editing?.answerEn} rows={5} />
              <TextAreaField label="الإجابة (AR)" name="answerAr" defaultValue={editing?.answerAr} rows={5} dir="rtl" />
              <SelectField label="Status" name="active" defaultValue={editing?.active === false ? "0" : "1"}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </SelectField>
              <TextField label="Sort order" name="sortOrder" defaultValue={editing?.sortOrder ?? 0} type="number" step="1" onWheel={(event) => event.currentTarget.blur()} />
            </FormGrid>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="gold" disabled={busy}>
                <T>Save question</T>
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(null)}>
                <T>Cancel</T>
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {deleting ? (
        <Confirm
          question={`Delete ${deleting.questionEn}?`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={async () => {
            if (await send("DELETE", `/admin/faq/${deleting.id}`, undefined, { done: "Question deleted" })) setOpen(null);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
