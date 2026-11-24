import { EmptyState } from "@/components/shared/empty-state";

/**
 * For a feature that has no backend yet. It says so, so an empty list is never mistaken for
 * "nothing here", and nothing is written to the browser in its place.
 */
export function NotAvailable({ what }: { what: string }) {
  return (
    <EmptyState
      title={`${what} not available yet`}
      description="This is not connected to the live service yet. Nothing you do here is kept."
    />
  );
}
