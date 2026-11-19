import type { ContractDocument } from "@/lib/types";

type Parties = Pick<ContractDocument, "status" | "clientName" | "counterpartyName">;

/**
 * Before a claim the queue shows metadata only. Neither party is shown, so
 * neither is searchable. After a claim both are.
 * The API still sends them; this only decides what the queue renders and matches.
 */
export function partiesVisibleInQueue(doc: Pick<ContractDocument, "status">): boolean {
  return doc.status !== "pending_review";
}

/** The text a queue search may match against for one document. */
export function queueSearchFields(doc: Parties & Pick<ContractDocument, "title">): string[] {
  return partiesVisibleInQueue(doc)
    ? [doc.title, doc.clientName, doc.counterpartyName]
    : [doc.title];
}

/** The parties line on the Up next card, or null when it must not be shown. */
export function upNextPartiesLine(doc: Parties): string | null {
  return partiesVisibleInQueue(doc) ? `${doc.clientName} and ${doc.counterpartyName}` : null;
}
