"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { payClientFee } from "@/lib/api/client/documents";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { PRICE_BASIS, TIER_PRICING, rupees } from "@/lib/config/pricing";
import { CONTRACT_TYPES } from "@/lib/mock/intake-options.mock";
import type { ClientDocument } from "@/lib/types";

/**
 * The step between a screened document and an advocate: one fixed fee.
 *
 * It says what the client already knows and nothing drawn from the review:
 * the tier screening assigned, the fee for it, and the deal facts the
 * assignment reads (the kind of agreement, its value, whether the other side
 * is a registered MSME). It never says why the tier is what it is beyond
 * that, because a reason could come from findings, and a client reads no
 * finding before sign-off.
 *
 * The payment is a plainly fake "Pay (preview)", with nothing to type. It can
 * be pressed again after a failure, and pressing it twice pays once.
 */
export function PaymentPanel({
  doc,
  onPaid,
}: {
  doc: Pick<ClientDocument, "id" | "type" | "tier" | "deal">;
  onPaid: (paid: ClientDocument) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // State alone cannot stop two presses in the same instant, because neither
  // has re-rendered yet. The ref is set at once, so only the first goes out.
  const inFlight = useRef(false);

  const tier = doc.tier ? TIER_PRICING[doc.tier] : null;
  const typeLabel = CONTRACT_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type;

  async function pay() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPaying(true);
    setFailed(null);
    try {
      onPaid(await payClientFee(MOCK_CLIENT_ORG.id, doc.id));
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "The payment did not go through. Try again.");
      setPaying(false);
      inFlight.current = false;
    }
  }

  return (
    <section
      aria-labelledby="pay-title"
      className="grid gap-x-10 gap-y-8 rounded-card bg-parchment p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]"
    >
      <div className="min-w-0">
        <p className="text-label font-medium text-muted-fg">Screened</p>
        <h2 id="pay-title" className="mt-1 font-display text-h2 text-ink">
          Pay the fee to send it to an advocate
        </h2>
        <p className="mt-3 max-w-measure text-body text-ink">
          {tier
            ? `Screening has assigned this document to ${tier.label} review. `
            : "Screening has assigned this document a review tier. "}
          Nothing reaches an advocate until the fee is paid.
        </p>

        <h3 className="mt-8 text-label font-medium text-muted-fg">The deal facts behind the tier</h3>
        <dl className="mt-3 grid max-w-md grid-cols-[10rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-meta">
          <dt className="text-muted-fg">Agreement</dt>
          <dd className="text-ink">{typeLabel}</dd>
          {doc.deal.transactionValue > 0 && (
            <>
              <dt className="text-muted-fg">Deal value</dt>
              <dd className="text-ink">{rupees(doc.deal.transactionValue)}</dd>
            </>
          )}
          <dt className="text-muted-fg">Counterparty</dt>
          <dd className="text-ink">
            {doc.deal.counterpartyIsMsme ? "A registered MSME" : "Not a registered MSME"}
          </dd>
        </dl>
      </div>

      <div className="min-w-0 self-start rounded-card bg-paper p-6">
        <p className="text-label font-medium text-muted-fg">{tier?.label ?? "Review"} · fixed fee</p>
        {tier ? (
          <>
            <p className="mt-2 font-display text-h1 text-ink">{tier.price}</p>
            <p className="text-meta text-muted-fg">{PRICE_BASIS}</p>
          </>
        ) : (
          <p className="mt-2 text-body text-ink">Set when the tier is assigned.</p>
        )}
        <p className="mt-4 text-meta text-ink">
          One fee for the document. It covers every revision round.
        </p>
        <p className="mt-1 text-label text-muted-fg">GST is added at the rate in force.</p>

        {failed && (
          <p role="alert" className="mt-4 text-meta text-flagged">
            {failed}
          </p>
        )}

        <Button className="mt-5 w-full" size="lg" onClick={pay} disabled={paying || !tier}>
          {paying ? "Paying" : failed ? "Try again" : "Pay (preview)"}
        </Button>
        <p className="mt-3 text-label text-muted-fg">Preview. No payment is taken.</p>
      </div>
    </section>
  );
}
