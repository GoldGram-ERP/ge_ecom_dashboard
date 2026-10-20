"use client";

import { T } from "@/components/t";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Confirm } from "@/components/modal";
import { TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatEgp, parseEgpToPiastres, piastresToInput } from "@/lib/money";
import { useSend } from "@/lib/use-send";

const LABELS = { buyPiastres: "Buy price", spreadPiastres: "Spread" };

// A field on the navy card.
const ON_NAVY = "num border-white/25 bg-white/10 text-white focus-visible:border-gold";
const ON_NAVY_LABEL = "text-xs font-medium text-white/70";

/** The inside of the navy "21K master" card: the file's #np, #nsp, pv() and setP(). */
export function MasterPriceForm({
  buyPiastres,
  spreadPiastres,
  spreadVisible,
  afterPublish,
}: {
  buyPiastres: number;
  spreadPiastres: number;
  spreadVisible: boolean;
  /** Page 1 of the history, where the new entry is. */
  afterPublish: string;
}) {
  const router = useRouter();
  const [buyText, setBuyText] = useState(piastresToInput(buyPiastres));
  const [spreadText, setSpreadText] = useState(piastresToInput(spreadPiastres));
  const [busy, setBusy] = useState(false);
  const [askLargeMove, setAskLargeMove] = useState(false);

  const buy = parseEgpToPiastres(buyText);
  const spread = parseEgpToPiastres(spreadText);

  async function publish(confirmLargeMove: boolean) {
    if (!buy.ok || !spread.ok || !(buy.piastres > 0) || spread.piastres >= buy.piastres) {
      toast("Enter a price above the spread");
      return;
    }
    setBusy(true);
    try {
      await api("/admin/prices", {
        method: "PUT",
        body: {
          buyPiastres: buy.piastres,
          spreadPiastres: spread.piastres,
          ...(confirmLargeMove ? { confirmLargeMove: true } : {}),
        },
      });
    } catch (error) {
      setBusy(false);
      if (error instanceof ApiError && error.code === "PRICE_JUMP") {
        setAskLargeMove(true);
        return;
      }
      setAskLargeMove(false);
      toast(errorMessage(error, LABELS));
      if (error instanceof ApiError && error.code === "UNAUTHENTICATED") router.replace("/login");
      return;
    }
    setBusy(false);
    setAskLargeMove(false);
    toast("Price published and logged");
    router.replace(afterPublish, { scroll: false });
    router.refresh();
  }

  return (
    <>
      <span className="text-xs font-medium tracking-[0.18em] text-gold-light uppercase"><T>21K master · buy (ask) price</T></span>
      <div className="flex flex-wrap items-baseline gap-3">
        <Input
          id="np"
          type="number"
          step="0.01"
          min="0"
          value={buyText}
          onChange={(event) => setBuyText(event.target.value)}
          aria-label="21K buy price"
          className={`${ON_NAVY} h-16 w-60 max-w-full px-3 text-4xl md:text-4xl`}
        />
        <span className="text-sm text-white/60"><T>EGP / gram</T></span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="nsp" className={ON_NAVY_LABEL}>
            <T>Spread (buy − sell)</T>
          </Label>
          <Input
            id="nsp"
            type="number"
            step="0.01"
            min="0"
            value={spreadText}
            onChange={(event) => setSpreadText(event.target.value)}
            className={`${ON_NAVY} h-9`}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="psl" className={ON_NAVY_LABEL}>
            <T>Sell price</T>
          </Label>
          {/* The file's pv(): buy − spread, as feedback while typing. The server publishes. */}
          <output id="psl" htmlFor="np nsp" className="num flex h-9 items-center text-xl text-gold-light">
            {buy.ok && spread.ok ? formatEgp(buy.piastres - spread.piastres) : "—"}
          </output>
        </div>
        <div className="grid content-start gap-1.5">
          <span className={ON_NAVY_LABEL}><T>Spread shown to customers</T></span>
          <b className="flex h-9 items-center text-xl font-medium"><T>{spreadVisible ? "Yes" : "No"}</T></b>
        </div>
      </div>
      <Button variant="gold" className="w-fit" disabled={busy} onClick={() => publish(false)}>
        <T>Publish price</T>
      </Button>
      {askLargeMove ? (
        <Confirm
          question="This moves the price by more than 5%. Publish anyway?"
          confirmLabel="Publish price"
          busy={busy}
          onConfirm={() => publish(true)}
          onCancel={() => setAskLargeMove(false)}
        />
      ) : null}
    </>
  );
}

/** The two fields and the button of the "Silver 999" card: the file's setAg(). */
export function SilverPriceForm({
  buyPiastres,
  spreadPiastres,
}: {
  buyPiastres: number;
  spreadPiastres: number;
}) {
  const { busy, send } = useSend();
  const [buyText, setBuyText] = useState(piastresToInput(buyPiastres));
  const [spreadText, setSpreadText] = useState(piastresToInput(spreadPiastres));

  function publish() {
    const buy = parseEgpToPiastres(buyText);
    const spread = parseEgpToPiastres(spreadText);
    if (!buy.ok || !spread.ok || !(buy.piastres > 0) || spread.piastres >= buy.piastres) {
      toast("Enter a valid silver price");
      return;
    }
    send(
      "PUT",
      "/admin/prices/silver",
      { buyPiastres: buy.piastres, spreadPiastres: spread.piastres },
      { done: "Silver price published", labels: LABELS },
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="nag"
          label="Buy / gram"
          type="number"
          step="0.01"
          min="0"
          value={buyText}
          onChange={(event) => setBuyText(event.target.value)}
        />
        <TextField
          id="nags"
          label="Spread"
          type="number"
          step="0.01"
          min="0"
          value={spreadText}
          onChange={(event) => setSpreadText(event.target.value)}
        />
      </div>
      <Button className="w-fit" disabled={busy} onClick={publish}>
        <T>Publish silver price</T>
      </Button>
    </>
  );
}
