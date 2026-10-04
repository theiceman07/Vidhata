import { clientVisibleFindings } from "@/lib/findings";
import type { ContractDocument } from "@/lib/types";

/**
 * Whose move it is on a document, read from the client's side.
 *
 * Shared by the documents list, which groups by it, and the "on your
 * desk" panel on every document page, which lists the other documents
 * waiting on the client so a visit to one leads to the next.
 */

export function openRequests(doc: ContractDocument) {
  return clientVisibleFindings(doc).filter(
    (f) => f.disposition === "pending" && f.changeRequest && !f.changeRequest.response,
  );
}

export function outstandingSteps(doc: ContractDocument) {
  return doc.executionSteps.filter((s) => s.applicable && !s.complete);
}

export type MoveGroup = "you" | "advocate" | "done";

export function groupOf(doc: ContractDocument): MoveGroup {
  if (
    doc.status === "revision" ||
    doc.status === "draft" ||
    doc.status === "awaiting_payment"
  ) {
    return "you";
  }
  if (doc.status === "settled" && outstandingSteps(doc).length > 0) return "you";
  if (doc.status === "settled" || doc.status === "executed") return "done";
  return "advocate";
}

export interface Move {
  note: string;
  action: string;
  href: string;
}

/** The move, when it is the client's. */
export function yourMove(doc: ContractDocument): Move | null {
  if (doc.status === "revision") {
    const n = openRequests(doc).length;
    const by = doc.advocate?.name ?? "your advocate";
    return {
      note: `${n} ${n === 1 ? "request" : "requests"} from ${by} to answer`,
      action: "Respond",
      href: `/documents/${doc.id}`,
    };
  }
  if (doc.status === "draft") {
    return {
      note: "Not submitted. Nothing reaches an advocate until it is.",
      action: "Submit",
      href: `/documents/${doc.id}`,
    };
  }
  if (doc.status === "awaiting_payment") {
    return {
      note: "Screened. Pay the fee to send it to an advocate.",
      action: "Pay",
      href: `/documents/${doc.id}`,
    };
  }
  if (doc.status === "settled") {
    const n = outstandingSteps(doc).length;
    return {
      note: `${n} ${n === 1 ? "step" : "steps"} left on the execution checklist`,
      action: "Execution checklist",
      href: `/documents/${doc.id}/checklist`,
    };
  }
  return null;
}
