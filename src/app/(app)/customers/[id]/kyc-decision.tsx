"use client";

import { T } from "@/components/t";
import { useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { SelectField, TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { useSend } from "@/lib/use-send";

// Someone else decided while this page was open.
const REFUSALS = {
  INVALID_TRANSITION: "This customer's KYC was already changed by someone else. The page has been refreshed.",
};

/** The "Decision" part of the KYC review: the file's kycAct() and kycRev(). */
export function KycDecision({ id, kyc }: { id: number; kyc: string }) {
  const { busy, send } = useSend();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  if (kyc === "Pending approval") {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField id="kr" label="Rejection reason" value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="">Choose a reason</option>
            <option>Document is blurry</option>
            <option>Name does not match</option>
            <option>ID is expired</option>
            <option>Selfie does not match</option>
            <option>Other</option>
          </SelectField>
          <TextField id="kn" label="Note to customer (optional)" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="gold"
            disabled={busy}
            onClick={() =>
              send(
                "POST",
                `/admin/customers/${id}/kyc`,
                { decision: "approve" },
                { done: "KYC approved", refusals: REFUSALS },
              )
            }
          >
            <T>Approve KYC</T>
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (!reason) {
                toast("Choose a rejection reason first");
                return;
              }
              send(
                "POST",
                `/admin/customers/${id}/kyc`,
                { decision: "reject", reason, ...(note.trim() ? { note: note.trim() } : {}) },
                { done: "KYC rejected, documents requested", refusals: REFUSALS },
              );
            }}
          >
            <T>Reject and request documents</T>
          </Button>
        </div>
      </>
    );
  }

  if (kyc === "Approved") {
    return (
      <Button
        variant="destructive"
        className="w-fit"
        disabled={busy}
        onClick={() =>
          send(
            "POST",
            `/admin/customers/${id}/kyc`,
            { decision: "revoke" },
            { done: "Approval revoked", refusals: REFUSALS },
          )
        }
      >
        <T>Revoke approval</T>
      </Button>
    );
  }

  return <p className="text-sm text-muted-foreground"><T>Waiting for the customer to upload documents.</T></p>;
}
