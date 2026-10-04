"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { BackButton } from "@/components/shared/back-button";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillingProfile, getInvoice } from "@/lib/api/billing";
import { INVOICE_KIND_LABEL } from "@/lib/billing";
import { PRICE_BASIS, rupees, tierLabel } from "@/lib/config/pricing";
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
      <div className="w-full max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-8 h-72 w-full rounded-card" />
      </div>
    );
  }

  if (state === "error" || !invoice || !profile) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-start gap-4">
        <BackButton fallbackHref="/billing" label="Billing" />
        <div>
          <p className="text-label font-medium text-muted-fg">Receipt</p>
          <h1 className="mt-1 font-display text-h1 text-ink">{invoice.number}</h1>
          <p className="mt-1 text-meta text-muted-fg">
            {format(new Date(invoice.issuedAt), "d MMMM yyyy")}
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-card bg-parchment p-6 md:p-8">
        <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-meta">
          <dt className="text-muted-fg">Made out to</dt>
          <dd className="text-ink">{profile.name || MOCK_CLIENT_ORG.name}</dd>
          {profile.gstin && (
            <>
              <dt className="text-muted-fg">GSTIN</dt>
              <dd className="text-ink">{profile.gstin}</dd>
            </>
          )}
          <dt className="text-muted-fg">For</dt>
          <dd className="text-ink">{invoice.description}</dd>
          <dt className="text-muted-fg">{INVOICE_KIND_LABEL[invoice.kind]}</dt>
          <dd className="text-ink">Fixed fee · {tierLabel(invoice.tier)} review</dd>
        </dl>

        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-label font-medium text-muted-fg">Amount</p>
          <p className="text-right">
            <span className="font-display text-h1 text-ink">{rupees(invoice.amount)}</span>
            <span className="ml-2 text-meta text-muted-fg">{PRICE_BASIS}</span>
          </p>
        </div>
        <p className="mt-4 max-w-measure text-label text-muted-fg">
          GST is added at the rate in force. A tax breakup is not part of this preview. The fee
          covers every revision round of the document.
        </p>
      </section>

      <p className="mt-4 text-label text-muted-fg">Preview receipt. No payment was taken.</p>
    </div>
  );
}
