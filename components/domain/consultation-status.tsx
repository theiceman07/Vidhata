import { Chip } from "@/components/document/state-label";
import { consultationTone } from "@/lib/tone";
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

/** The state as a chip: tone and icon say whose move it is, the words say what. */
export function ConsultationStatus({
  consultation,
  audience,
  className,
}: {
  consultation: Reading;
  audience: "client" | "advocate";
  className?: string;
}) {
  const { tone, icon } = consultationTone(consultation, audience);
  return (
    <Chip tone={tone} icon={icon} className={className}>
      {consultationLabel(consultation, audience)}
    </Chip>
  );
}
