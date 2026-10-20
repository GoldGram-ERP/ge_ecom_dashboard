"use client";

import { useRouter } from "next/navigation";
import { CustomerForm, type CustomerFormValues } from "../customer-form";

/** The "Edit" tab: saving or cancelling goes back to the overview. */
export function EditTab({ id, initial }: { id: number; initial: CustomerFormValues }) {
  const router = useRouter();
  const back = () => router.replace(`/customers/${id}`, { scroll: false });
  return <CustomerForm customerId={id} initial={initial} submitLabel="Update" onSaved={back} onCancel={back} />;
}
