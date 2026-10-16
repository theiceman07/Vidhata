"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { BackButton } from "@/components/shared/back-button";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillingProfile, getInvoice } from "@/lib/api/billing";
import { INVOICE_KIND_LABEL, invoiceBasis } from "@/lib/billing";
import { PRICE_BASIS, rupees } from "@/lib/config/pricing";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { BillingProfile, Invoice } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * A receipt: what was paid for, when, and who it is made out to.
 *
 * It says nothing of what the review found, no finding count and no layer,
 * because a client reads no finding before sign-off and a receipt is for
 * anyone in the organisation's accounts to read.
 */
export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [found, details] = await Promise.all([
        getInvoice(MOCK_CLIENT_ORG.id, params.id),
        getBillingProfile(MOCK_CLIENT_ORG.id),
      ]);
      if (!found) throw new Error("This invoice was not found.");
      setInvoice(found);
      setProfile(details);
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load this receipt.");
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="w-full lg:px-[3%]">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64 w-full rounded-card" />
      </div>
    );
  }

  if (state === "error" || !invoice || !profile) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div className="w-full lg:px-[3%]">
      <p className="text-label font-medium text-muted-fg">Receipt · Preview</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <BackButton fallbackHref="/billing" label="Billing" />
        <h1 className="min-w-0 font-display text-h1 text-ink">{invoice.number}</h1>
        <p className="text-meta text-muted-fg md:ml-auto">
          {format(new Date(invoice.issuedAt), "d MMMM yyyy")}
        </p>
      </div>

      <section className="mt-6 overflow-hidden rounded-card border border-line bg-paper">
        <div className="grid md:grid-cols-[minmax(0,69fr)_minmax(0,31fr)]">
          <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] content-center items-baseline gap-x-4 gap-y-3 p-6 text-meta md:grid-cols-[8rem_minmax(0,1fr)] md:p-8">
            <dt className="text-muted-fg">Made out to</dt>
            <dd className="text-ink">{profile.name || MOCK_CLIENT_ORG.name}</dd>
            {profile.gstin && (
              <>
                <dt className="text-muted-fg">GSTIN</dt>
                <dd className="text-ink">{profile.gstin}</dd>
              </>
            )}
            <dt className="text-muted-fg">For</dt>
            <dd className="text-base font-medium text-ink [overflow-wrap:anywhere]">
              {invoice.description}
            </dd>
            <dt className="text-muted-fg">{INVOICE_KIND_LABEL[invoice.kind]}</dt>
            <dd className="text-ink">{invoiceBasis(invoice)}</dd>
          </dl>

          <div className="flex flex-col justify-center border-t border-line bg-parchment/60 p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-label font-medium text-muted-fg">Amount</p>
            <p className="mt-2 font-display text-[44px] font-medium leading-none tracking-tight tabular-nums text-ink md:text-[48px]">
              {rupees(invoice.amount)}
            </p>
            <p className="mt-2 text-meta text-muted-fg">{PRICE_BASIS}</p>
          </div>
        </div>

        <div className="border-t border-line px-6 py-4 md:px-8 md:py-5">
          <p className="max-w-measure text-label text-muted-fg">
            GST is added at the rate in force. A tax breakup is not part of this preview.{" "}
            {invoice.kind === "consultation_fee"
              ? "This is the consultation fee. It is separate from the document fee. Who issues an invoice for it is waiting for counsel to confirm, and the wording here is not final."
              : "The fee covers every revision round of the document."}
          </p>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-label text-muted-fg">Preview receipt. No payment was taken.</p>
        <div className="flex items-center gap-3">
          <span className="text-label text-muted-fg">Downloads aren&apos;t enabled in this preview</span>
          <Button variant="outline" disabled>
            Download receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
