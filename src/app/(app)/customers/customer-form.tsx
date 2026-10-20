"use client";

import { T } from "@/components/t";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { DateTextField, SelectField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { useSend } from "@/lib/use-send";

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  idType: "national_id" | "passport";
  nationalId: string;
}

const LABELS = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  dateOfBirth: "Date of Birth",
  nationality: "Nationality",
  idType: "ID document",
  nationalId: "ID number",
};

/**
 * The fields of "New customer" and of a customer's "Edit" tab. A new customer also has an
 * email; an existing one keeps the email they sign in with. The server applies the same rules.
 */
export function CustomerForm({
  customerId,
  initial,
  submitLabel,
  onSaved,
  onCancel,
}: {
  /** Absent for a new customer. */
  customerId?: number;
  initial: CustomerFormValues;
  submitLabel: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { busy, send } = useSend();
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth);
  const creating = customerId === undefined;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const firstName = text("firstName");
    const lastName = text("lastName");
    const email = text("email");
    const phone = text("phone");
    const nationalId = text("nationalId");
    if (!firstName || !lastName) {
      toast("Enter a first and last name");
      return;
    }
    if (creating && !/^\S+@\S+\.\S+$/.test(email)) {
      toast("Enter a valid email");
      return;
    }
    if (phone && phone.replace(/\D/g, "").length < 10) {
      toast("Enter a valid phone number");
      return;
    }
    const idType = text("idType");
    if (nationalId && idType === "passport" && !/^[A-Za-z0-9]{5,20}$/.test(nationalId)) {
      toast("A passport number is 5 to 20 letters and digits, with no spaces");
      return;
    }
    if (nationalId && idType !== "passport" && !/^[0-9\u0660-\u0669\u06F0-\u06F9]{14}$/.test(nationalId)) {
      toast("A national ID is 14 digits");
      return;
    }
    const body = {
      firstName,
      lastName,
      ...(creating ? { email } : {}),
      // An existing customer's phone, date and ID can be cleared; a new one just leaves them out.
      ...(phone || !creating ? { phone } : {}),
      ...(dateOfBirth || !creating ? { dateOfBirth } : {}),
      ...(text("nationality") ? { nationality: text("nationality") } : {}),
      ...(nationalId || !creating ? { nationalId, idType } : {}),
    };
    const saved = await send(creating ? "POST" : "PATCH", creating ? "/admin/customers" : `/admin/customers/${customerId}`, body, {
      done: creating ? "Customer created" : "Customer updated",
      labels: LABELS,
      refusals: { EMAIL_TAKEN: "That email is already used" },
    });
    if (saved) onSaved();
  }

  return (
    <form onSubmit={save} noValidate className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First Name *" name="firstName" defaultValue={initial.firstName} maxLength={50} autoComplete="off" />
        <TextField label="Last Name *" name="lastName" defaultValue={initial.lastName} maxLength={50} autoComplete="off" />
        {creating ? (
          <TextField label="Email *" name="email" type="email" defaultValue={initial.email ?? ""} maxLength={254} autoComplete="off" />
        ) : null}
        <TextField label="Phone" name="phone" type="tel" defaultValue={initial.phone} maxLength={20} autoComplete="off" />
        <DateTextField label="Date of Birth" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
        <TextField label="Nationality" name="nationality" defaultValue={initial.nationality} maxLength={50} autoComplete="off" />
        <SelectField label={LABELS.idType} name="idType" defaultValue={initial.idType}>
          <option value="national_id">National ID</option>
          <option value="passport">Passport</option>
        </SelectField>
        <TextField label={LABELS.nationalId} name="nationalId" defaultValue={initial.nationalId} maxLength={20} autoComplete="off" />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <T>Cancel</T>
        </Button>
        <Button type="submit" variant="gold" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
