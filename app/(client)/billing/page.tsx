"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillingProfile, listInvoices, saveBillingProfile } from "@/lib/api/billing";
import { INVOICE_KIND_LABEL } from "@/lib/billing";
import { PRICE_BASIS, rupees, tierLabel } from "@/lib/config/pricing";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { BillingProfile, Invoice } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * Billing: what has been paid, and who the invoices are made out to.
 *
 * Every amount is one flat fee, quoted before GST. A document fee and a
 * consultation fee are separate lines with separate labels, so neither can
 * be read as part of the other. Nothing here knows what a review found.
 */
export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [list, details] = await Promise.all([
        listInvoices(MOCK_CLIENT_ORG.id),
        getBillingProfile(MOCK_CLIENT_ORG.id),
      ]);
      setInvoices(list);
      setProfile(details);
      setName(details.name);
      setGstin(details.gstin ?? "");
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load your billing.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveBillingProfile(MOCK_CLIENT_ORG.id, { name, gstin });
      setProfile(saved);
      setName(saved.name);
      setGstin(saved.gstin ?? "");
      toast.success("Billing details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your billing details.");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-10 w-48" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-card" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const unchanged =
    profile !== null && name.trim() === profile.name && gstin.trim() === (profile.gstin ?? "");

  return (
    <div className="w-full">
      <h1 className="font-display text-h1 text-ink">Billing</h1>
      <p className="mt-2 max-w-measure text-body text-muted-fg">
        One fixed fee per document, set by its review tier, covering every revision round. All
        amounts are {PRICE_BASIS}. GST is added at the rate in force, and a tax breakup is not part
        of this preview.
      </p>

      <div className="mt-10 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="invoices-title" className="min-w-0">
          <h2 id="invoices-title" className="text-label font-medium text-muted-fg">
            Invoices
          </h2>

          {invoices.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No invoices yet"
                description="A document fee is invoiced when you pay it, once the document has been screened."
                action={
                  <Button asChild variant="outline">
                    <Link href="/documents">Your documents</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {invoices.map((invoice) => (
                <li key={invoice.number}>
                  <Link
                    href={`/billing/${invoice.number}`}
                    className="grid gap-x-6 gap-y-1 rounded-card bg-parchment p-5 transition-colors hover:bg-parchment/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <span className="min-w-0">
                      <span className="block text-label text-muted-fg">
                        {invoice.number} · {format(new Date(invoice.issuedAt), "d MMM yyyy")}
                      </span>
                      <span className="mt-1 block truncate text-body font-medium text-ink">
                        {invoice.description}
                      </span>
                      <span className="mt-0.5 block text-meta text-muted-fg">
                        {INVOICE_KIND_LABEL[invoice.kind]} · {tierLabel(invoice.tier)}
                      </span>
                    </span>
                    <span className="sm:text-right">
                      <span className="block font-display text-h3 text-ink">
                        {rupees(invoice.amount)}
                      </span>
                      <span className="block text-label text-muted-fg">{PRICE_BASIS}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 max-w-measure text-meta text-muted-fg">
            Consultation fees are separate from the document fee. They are invoiced on their own
            line, and only if an advocate accepts a request.
          </p>
        </section>

        <aside className="min-w-0 self-start rounded-card bg-parchment p-6">
          <h2 className="font-display text-h3 text-ink">Billing details</h2>
          <form onSubmit={save} className="mt-4 space-y-4" noValidate>
            <div>
              <Label htmlFor="billing-name">Invoices made out to</Label>
              <Input
                id="billing-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="organization"
              />
            </div>
            <div>
              <Label htmlFor="billing-gstin">GSTIN (optional)</Label>
              <Input
                id="billing-gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                aria-describedby="billing-gstin-note"
              />
              <p id="billing-gstin-note" className="mt-1.5 text-label text-muted-fg">
                Kept as you enter it. It is not checked against any register.
              </p>
            </div>
            <Button type="submit" disabled={saving || unchanged || name.trim() === ""}>
              {saving ? "Saving" : "Save details"}
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
