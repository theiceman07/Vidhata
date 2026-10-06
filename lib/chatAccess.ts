import type { ClientDocument } from "@/lib/types";

/**
 * When the document agent may appear: once the document is signed off, and not
 * before. The agent explains the settled document, so before sign-off there is
 * no settled text for it to explain, and a draft's wording is not the client's
 * to read through it.
 *
 * Read from what the client is handed. A document says it is signed off only
 * with a recorded advocate and date (`signOff`), and its status has to say so
 * as well: a record that disagrees with itself is read as not signed off.
 *
 * One rule, used by the document page, the chat page and the agent itself, so
 * the three cannot disagree and a new place to put the agent has to answer it.
 */
export function agentAvailable(doc: Pick<ClientDocument, "status" | "signOff">): boolean {
  return doc.signOff !== null && (doc.status === "settled" || doc.status === "executed");
}
