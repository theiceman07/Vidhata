import type { ClientDocumentSummary } from "@/lib/types";

/**
 * Whose move it is on a document, read from the client's side.
 *
 * Shared by the documents list, which groups by it, and the "on your
 * desk" panel on every document page, which lists the other documents
 * waiting on the client so a visit to one leads to the next.
 *
 * Read from the summary a client is handed, never from the document itself.
 * Nothing here names the advocate: before sign-off a client is told "your
 * advocate".
 */

/** What a move reads of a document. */
export type MoveSource = Pick<ClientDocumentSummary, "id" | "status" | "openRequests" | "checklist">;

/** Execution steps still open. Zero until the document is signed off. */
export function outstandingSteps(doc: Pick<MoveSource, "checklist">): number {
  return doc.checklist.total - doc.checklist.done;
}

export type MoveGroup = "you" | "advocate" | "done";

export function groupOf(doc: MoveSource): MoveGroup {
  if (
    doc.status === "revision" ||
    doc.status === "draft" ||
    doc.status === "awaiting_payment"
  ) {
    return "you";
  }
  if (doc.status === "settled" && outstandingSteps(doc) > 0) return "you";
  if (doc.status === "settled" || doc.status === "executed") return "done";
  return "advocate";
}

export interface Move {
  note: string;
  action: string;
  href: string;
}

/**
 * The sentence under the greeting: what is waiting on the client, in the words
 * of what they have to do. A settled document with steps left is on the
 * client's desk (groupOf), but it is not "needing" them today, so it is said
 * as steps left on its execution checklist and never as a document that needs
 * an answer. Returns null when nothing is on their desk.
 */
export function youSummary(docs: MoveSource[]): string | null {
  const count = (pick: (d: MoveSource) => boolean) => docs.filter(pick).length;
  const answers = count((d) => d.status === "revision");
  const payments = count((d) => d.status === "awaiting_payment");
  const drafts = count((d) => d.status === "draft");
  const steps = count((d) => d.status === "settled" && outstandingSteps(d) > 0);

  const parts: string[] = [];
  if (answers > 0) parts.push(`${answers} ${answers === 1 ? "document needs" : "documents need"} your answer`);
  if (payments > 0) parts.push(`${payments} ${payments === 1 ? "is" : "are"} waiting for your payment`);
  if (drafts > 0) parts.push(`${drafts} ${drafts === 1 ? "is" : "are"} not submitted yet`);
  if (steps > 0) {
    parts.push(`${steps} ${steps === 1 ? "has" : "have"} steps left on the execution checklist`);
  }
  if (parts.length === 0) return null;

  const head = parts.slice(0, -1).join(", ");
  const sentence = parts.length === 1 ? parts[0] : `${head} and ${parts[parts.length - 1]}`;
  return `${sentence}.`;
}

/** The move, when it is the client's. */
export function yourMove(doc: MoveSource): Move | null {
  if (doc.status === "revision") {
    // The wording says that the advocate asked, and nothing of where the
    // request stands now: a client is never told what was decided before sign-off.
    const n = doc.openRequests;
    return {
      note:
        n > 1
          ? `Your advocate asked for your answer on ${n} requests`
          : "Your advocate asked for your answer",
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
    const n = outstandingSteps(doc);
    return {
      note: `${n} ${n === 1 ? "step" : "steps"} left on the execution checklist`,
      action: "Execution checklist",
      href: `/documents/${doc.id}/checklist`,
    };
  }
  return null;
}
