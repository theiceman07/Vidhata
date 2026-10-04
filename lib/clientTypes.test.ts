import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ClientAuditEntry,
  ClientChangeRequest,
  ClientCitation,
  ClientClause,
  ClientDeal,
  ClientDiff,
  ClientDocument,
  ClientFinding,
  ClientFindingDetail,
  ClientVersionList,
  ContractDocument,
  DocumentVersion,
} from "./types";

/**
 * The field matrix for what a client may be handed.
 *
 * These are type-level assertions: `npm run typecheck` is what fails when one
 * breaks, and vitest only has to load the file. A client type that gains a
 * restricted key at any depth stops compiling here, which is the point of
 * building the boundary out of types and not out of browser narrowing.
 *
 * PROPOSAL: the types are not agreed with the backend team yet. When they are,
 * this list is what the backend's own response tests start from.
 */

/** Every key at any depth, through arrays and nullable members. */
type DeepKeys<T> = T extends readonly (infer U)[]
  ? DeepKeys<U>
  : T extends object
    ? { [K in keyof T & string]: K | DeepKeys<T[K]> }[keyof T & string]
    : never;

/**
 * Keys no client type may carry. The pipeline's machinery (rule, layer,
 * source), the advocate's working (override note, resolution time, who asked,
 * conflict, notes), and money and tenancy (payment, amount, fee, org).
 * `advocate` is checked on the document itself, not here, because the sign-off
 * record's own `advocate` is the name a client is meant to read after sign-off.
 */
type Restricted =
  | "ruleApplied"
  | "layer"
  | "source"
  | "overrideNote"
  | "resolvedAt"
  | "requestedBy"
  | "findingIds"
  | "orgId"
  | "payment"
  | "amount"
  | "fee"
  | "bar"
  | "conflictDeclaredAt"
  | "corpusReviewLoggedAt"
  | "analysisCompletesAt"
  | "revisionCount"
  | "revisedAt"
  | "advocateOnly"
  | "notes";

type Leak<T> = Extract<DeepKeys<T>, Restricted>;

describe("the walk that finds a restricted key", () => {
  it("sees a key at any depth, through arrays and null", () => {
    type Probe = { a: { b: { ruleApplied: string }[] | null }; layer?: number };
    expectTypeOf<Leak<Probe>>().toEqualTypeOf<"ruleApplied" | "layer">();
  });

  it("finds the restricted keys in the internal types", () => {
    // Guards against a vacuous pass: if the list no longer matches the
    // internal shapes, the assertions below would prove nothing.
    type Internal = Leak<ContractDocument> | Leak<DocumentVersion>;
    expectTypeOf<"ruleApplied" | "layer" | "source" | "overrideNote" | "resolvedAt">().toMatchTypeOf<Internal>();
    expectTypeOf<"orgId" | "payment" | "amount" | "bar">().toMatchTypeOf<Internal>();
  });
});

describe("client types carry no restricted key", () => {
  it("not the document", () => {
    expectTypeOf<Leak<ClientDocument>>().toBeNever();
  });

  it("not a finding, with its detail, request and sources", () => {
    expectTypeOf<Leak<ClientFinding>>().toBeNever();
    expectTypeOf<Leak<ClientFindingDetail>>().toBeNever();
    expectTypeOf<Leak<ClientChangeRequest>>().toBeNever();
    expectTypeOf<Leak<ClientCitation>>().toBeNever();
  });

  it("not a clause or the deal", () => {
    expectTypeOf<Leak<ClientClause>>().toBeNever();
    expectTypeOf<Leak<ClientDeal>>().toBeNever();
  });

  it("not the version list, the diff or the trail", () => {
    expectTypeOf<Leak<ClientVersionList>>().toBeNever();
    expectTypeOf<Leak<ClientDiff>>().toBeNever();
    expectTypeOf<Leak<ClientAuditEntry>>().toBeNever();
  });
});

describe("what a client document is, and is not", () => {
  it("meets the advocate only in the sign-off record", () => {
    expectTypeOf<ClientDocument>().not.toHaveProperty("advocate");
    expectTypeOf<ClientDocument["signOff"]>().toEqualTypeOf<{
      advocate: string;
      enrolment: string;
      at: string;
    } | null>();
  });

  it("says that it was paid and never how much", () => {
    expectTypeOf<ClientDocument["paidAt"]>().toEqualTypeOf<string | null>();
    expectTypeOf<ClientDocument>().not.toHaveProperty("payment");
  });

  it("names its findings list so client code never reads a document's findings", () => {
    expectTypeOf<ClientDocument>().not.toHaveProperty("findings");
    expectTypeOf<ClientDocument["findingList"]>().toEqualTypeOf<ClientFinding[]>();
  });

  it("refers to a finding by its number and by nothing else", () => {
    expectTypeOf<ClientFinding>().not.toHaveProperty("findingId");
    expectTypeOf<ClientFinding>().not.toHaveProperty("id");
    expectTypeOf<ClientFinding["number"]>().toBeString();
    expectTypeOf<ClientAuditEntry>().not.toHaveProperty("findingId");
    expectTypeOf<ClientAuditEntry["findingNumber"]>().toEqualTypeOf<string | null>();
  });

  it("keeps the advocate-added mark optional, so the switch never changes the type", () => {
    expectTypeOf<ClientFindingDetail["advocateAdded"]>().toEqualTypeOf<true | undefined>();
  });

  it("gives a finding its detail only after sign-off", () => {
    expectTypeOf<ClientFinding["detail"]>().toEqualTypeOf<ClientFindingDetail | null>();
  });

  it("loads", () => {
    // vitest needs one runtime assertion; the checks above run in tsc.
    expect(true).toBe(true);
  });
});
