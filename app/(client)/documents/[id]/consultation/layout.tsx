import { ConsultationsGate } from "@/components/shared/consultations-off";

/** Consultations are off for now (lib/config/consultations.ts). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ConsultationsGate>{children}</ConsultationsGate>;
}
