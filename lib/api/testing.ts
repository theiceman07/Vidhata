import { vi } from "vitest";
import type { ContractDocument } from "@/lib/types";
import {
  claimDocument,
  createDraftDocument,
  getDocument,
  payFee,
  signOffDocument,
  startAnalysis,
  updateFinding,
  withdrawCitation,
} from "./documents";

/**
 * Setting a document up the way the product does, through the public API, for
 * tests that need one in a given state. They all need fake timers
 * (`vi.useFakeTimers()`), because the mock layer waits and screening takes a
 * stretch of time.
 */

export const advocate = { id: "adv-test", name: "Test Advocate", bar: "XX/0001/2020" };
export const otherAdvocate = { id: "adv-other", name: "Other Advocate", bar: "XX/0002/2020" };
export const declaration = { noConflictWithEitherParty: true } as const;

export async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

/** The refusal's message, or "" if it was not refused. */
export async function refusal(promise: Promise<unknown>): Promise<string> {
  const caught = promise.then(
    () => "",
    (e: Error) => e.message,
  );
  await vi.runAllTimersAsync();
  return caught;
}

interface Deal {
  type?: ContractDocument["type"];
  stateOfExecution?: string;
  transactionValue?: number;
}

/** Created and screened, and not paid for: awaiting payment, with the first pass's findings. */
export async function screenedDocument(deal: Deal = {}): Promise<ContractDocument> {
  const type = deal.type ?? "vendor";
  const draft = await settle(
    createDraftDocument({
      title: `Gate test ${type}`,
      type,
      clientName: "Anaya Textiles Pvt Ltd",
      counterpartyName: "Counterparty Pvt Ltd",
      stateOfExecution: deal.stateOfExecution ?? "Delhi",
      transactionValue: deal.transactionValue ?? 150_000,
      counterpartyIsMsme: false,
      durationMonths: 12,
      governingLaw: "Laws of India",
      keyTerms: "",
    }),
  );
  await settle(startAnalysis(draft.id));
  // Reading it after the analysis window reconciles it to awaiting payment.
  vi.advanceTimersByTime(60_000);
  return (await settle(getDocument(draft.id)))!;
}

/** Paid for and released, not yet claimed. */
export async function releasedDocument(deal: Deal = {}): Promise<ContractDocument> {
  const screened = await screenedDocument(deal);
  return settle(payFee(screened.id));
}

/** Released and claimed by `who`. */
export async function claimedDocument(
  deal: Deal = {},
  who: typeof advocate = advocate,
): Promise<ContractDocument> {
  const released = await releasedDocument(deal);
  return settle(claimDocument(released.id, who, declaration));
}

/**
 * Every finding settled, the way an advocate does it: a blocked source is
 * withdrawn with a note, and a finding with no verified source left is settled
 * with the reasoning written down.
 */
export async function settleEverything(
  docId: string,
  who: typeof advocate = advocate,
): Promise<ContractDocument> {
  let doc = (await settle(getDocument(docId)))!;
  for (const finding of doc.findings) {
    let current = finding;
    for (const citation of current.citations.filter((c) => c.status === "blocked")) {
      doc = await settle(
        withdrawCitation(docId, current.findingId, citation.id, "Not in the approved corpus.", who),
      );
      current = doc.findings.find((f) => f.findingId === finding.findingId)!;
    }
    const hasVerified = current.citations.some((c) => c.status === "verified" && !c.withdrawn);
    doc = await settle(
      updateFinding(
        docId,
        finding.findingId,
        hasVerified
          ? { disposition: "confirmed", overrideNote: null }
          : { disposition: "overridden", overrideNote: "Reviewed. The clause stands as drafted." },
        who.id,
      ),
    );
  }
  return doc;
}

/** Claimed, every finding settled, and signed off. */
export async function signedOffDocument(
  deal: Deal = {},
  who: typeof advocate = advocate,
): Promise<ContractDocument> {
  const claimed = await claimedDocument(deal, who);
  await settleEverything(claimed.id, who);
  return settle(signOffDocument(claimed.id, who.id));
}
