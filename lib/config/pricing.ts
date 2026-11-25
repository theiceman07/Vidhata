/**
 * Money formatting, and the consultation fee (the consultation is hidden from the
 * product for now: lib/config/consultations.ts). Document prices are the plans in
 * lib/config/plans.ts.
 */
export const PRICING_IS_INDICATIVE = true;

/**
 * What every figure is quoted as. No screen shows a bare rupee amount that
 * reads as final: a real invoice carries a proper tax breakup, which this
 * preview does not compute (see the plan's open items).
 */
export const PRICE_BASIS = "before GST";

/** Whole rupees, Indian grouping: 4999 becomes "₹4,999". */
export function rupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * A conversation with the advocate who settled the document. A request is
 * free; the fee is payable only if the advocate accepts, so the charge step
 * arrives with the advocate's inbox.
 */
const CONSULTATION_AMOUNT = 2999;
export const CONSULTATION = {
  label: "Consultation with your settling advocate",
  amount: CONSULTATION_AMOUNT,
  price: rupees(CONSULTATION_AMOUNT),
};

