import { cn } from "@/lib/utils";
import type { Consultation } from "@/lib/types";

type Reading = Pick<Consultation, "status"> & { paid: boolean };

/**
 * What a consultation's state is called, in the words of whoever reads it. The
 * client and the advocate see the same four states, and the advocate sees only
 * whether the fee is paid, never how.
 */
export function consultationLabel(c: Reading, audience: "client" | "advocate"): string {
  switch (c.status) {
    case "requested":
      return "Requested";
    case "declined":
      return "Declined";
    case "answered":
      return "Answered";
    case "accepted":
      if (audience === "client") return c.paid ? "Paid · awaiting the answer" : "Accepted · fee to pay";
      return c.paid ? "Paid · to answer" : "Accepted · waiting for payment";
  }
}

/** The state as a pill. Neutral, except answered: a settled request carries the accent. */
export function ConsultationStatus({
  consultation,
  audience,
  className,
}: {
  consultation: Reading;
  audience: "client" | "advocate";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-label font-medium",
        consultation.status === "answered"
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-line text-ink",
        className,
      )}
    >
      {consultationLabel(consultation, audience)}
    </span>
  );
}
