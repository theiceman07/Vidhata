import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewTier } from "@/lib/types";

interface Tier {
  tier: ReviewTier;
  label: string;
  price: string;
  description: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    tier: "standard",
    label: "Standard",
    price: "₹4,999",
    description: "NDAs and low-value vendor agreements.",
  },
  {
    tier: "enhanced",
    label: "Enhanced",
    price: "₹12,999",
    description: "MSAs and mid-value deals with an MSME counterparty.",
    featured: true,
  },
  {
    tier: "senior",
    label: "Senior review",
    price: "₹24,999",
    description: "High-value or employment agreements needing senior sign-off.",
  },
];

const MATRIX: { label: string; values: [boolean, boolean, boolean] }[] = [
  { label: "AI drafting from curated corpus", values: [true, true, true] },
  { label: "7-layer statutory screen", values: [true, true, true] },
  { label: "Advocate sign-off", values: [true, true, true] },
  { label: "Execution checklist", values: [true, true, true] },
  { label: "Senior advocate review", values: [false, false, true] },
  { label: "Priority turnaround", values: [false, true, true] },
];

export function PricingTable() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.tier}
            className={cn(
              "rounded-card border p-6 shadow-card",
              t.featured ? "border-accent bg-accent/5" : "border-line bg-paper",
            )}
          >
            <h3 className="font-display text-h3 text-ink">{t.label}</h3>
            <p className="mt-1 font-display text-h1 text-ink">{t.price}</p>
            <p className="mt-2 text-small text-muted-fg">{t.description}</p>
            <Button asChild className="mt-4 w-full" variant={t.featured ? "default" : "outline"}>
              <Link href="/new">Start a deal</Link>
            </Button>
            {/* QA 3.2: the wizard now has a tier step, but there is still
                no checkout anywhere in the product, so say so instead of
                implying a purchase happens. */}
            <p className="mt-2 text-small text-muted-fg">
              Billing is not enabled in this preview. No payment is taken.
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 overflow-x-auto rounded-card border border-line bg-paper shadow-card">
        <table className="w-full text-left text-body">
          <thead className="border-b border-line bg-canvas/50 text-small text-muted-fg">
            <tr>
              <th className="px-4 py-3 font-medium">Feature</th>
              {TIERS.map((t) => (
                <th key={t.tier} className="px-4 py-3 text-center font-medium">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.label} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="px-4 py-3 text-center">
                    {v ? (
                      <Check
                        className="mx-auto h-4 w-4 text-verified"
                        aria-label="Included"
                      />
                    ) : (
                      <Minus
                        className="mx-auto h-4 w-4 text-muted-fg"
                        aria-label="Not included"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
