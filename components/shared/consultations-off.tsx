import { EmptyState } from "@/components/shared/empty-state";
import { CONSULTATIONS_ENABLED } from "@/lib/config/consultations";

/**
 * Wraps the consultation and payout routes. While consultations are off (lib/config/
 * consultations.ts) a direct address to one says so instead of opening the flow.
 */
export function ConsultationsGate({ children }: { children: React.ReactNode }) {
  if (CONSULTATIONS_ENABLED) return <>{children}</>;
  return (
    <div className="w-full py-10">
      <EmptyState
        title="Consultations aren't offered at the moment"
        description="Vidhataa's plans cover drafting and review. A consultation with an advocate isn't part of them for now."
      />
    </div>
  );
}
