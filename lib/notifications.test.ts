import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { shapeClientConsultation } from "./api/client/consultations";
import { leaked, markersFor } from "./api/client/markers";
import { notifiableConsultation, notifiableDocument } from "./api/client/notifications";
import { shapeClientSummary } from "./api/client/shape-document";
import { mockDocuments } from "./mock/documents.mock";
import { buildClientNotifications } from "./notifications";
import type { ClientNotification, Consultation, ContractDocument, DocumentStatus } from "./types";

/**
 * Notifications are the easiest place to leak: a sentence is written by hand and
 * nobody reads it twice. So every fixture is built into notifications, at every
 * status, beside consultation requests in every state that carry a question and an
 * answer to be found, and the text is searched for what a client may not be told.
 */

const STATUSES: DocumentStatus[] = [
  "draft",
  "analysing",
  "awaiting_payment",
  "pending_review",
  "under_review",
  "revision",
  "settled",
  "executed",
];

const QUESTION = "SENTINEL-QUESTION may the other side assign this agreement";
const ANSWER = "SENTINEL-ANSWER yes, with the other side's written consent";
const ADVOCATE = "Rhea Kapoor";
const CONSULTED_TITLE = "Mutual NDA · Consulted";

function consultation(over: Partial<Consultation>): Consultation {
  return {
    id: "consultation-test",
    documentId: "doc-nda-settled",
    documentTitle: CONSULTED_TITLE,
    orgId: "org-anaya-textiles",
    clientName: "Anaya Textiles Pvt Ltd",
    advocateId: "adv-1",
    advocateName: ADVOCATE,
    question: QUESTION,
    status: "requested",
    requestedAt: "2026-10-01T09:00:00.000Z",
    acceptedAt: null,
    declinedAt: null,
    fee: null,
    paidAt: null,
    answer: null,
    answeredAt: null,
    ...over,
  };
}

/** A request in every state it can be in, each holding a question, and an answer where there is one. */
const CONSULTATIONS: Consultation[] = [
  consultation({ id: "c-requested", status: "requested" }),
  consultation({ id: "c-declined", status: "declined", declinedAt: "2026-10-02T09:00:00.000Z" }),
  consultation({
    id: "c-accepted",
    status: "accepted",
    acceptedAt: "2026-10-02T09:00:00.000Z",
    fee: 2999,
  }),
  consultation({
    id: "c-paid",
    status: "accepted",
    acceptedAt: "2026-10-02T09:00:00.000Z",
    fee: 2999,
    paidAt: "2026-10-03T09:00:00.000Z",
  }),
  consultation({
    id: "c-answered",
    status: "answered",
    acceptedAt: "2026-10-02T09:00:00.000Z",
    fee: 2999,
    paidAt: "2026-10-03T09:00:00.000Z",
    answer: ANSWER,
    answeredAt: "2026-10-04T09:00:00.000Z",
  }),
];

const requests = CONSULTATIONS.map((c) => notifiableConsultation(shapeClientConsultation(c)));

/** The document at a status it may not be in, and with requests it may or may not have open. */
function variants(doc: ContractDocument) {
  const summary = shapeClientSummary(doc);
  return STATUSES.flatMap((status) =>
    [summary.openRequests, 0, 2].map((openRequests) =>
      notifiableDocument({ ...summary, status, openRequests }),
    ),
  );
}

/** Everything notifications can say about one fixture, at every status, beside every request. */
function everythingFor(doc: ContractDocument): ClientNotification[] {
  return variants(doc).flatMap((d) => buildClientNotifications([d], requests));
}

const titles = [...mockDocuments.map((d) => d.title), CONSULTED_TITLE];

/** The text with a document's title taken out, which is the client's own and may hold anything. */
const withoutTitles = (text: string) => titles.reduce((t, title) => t.split(title).join(""), text);

describe("the notifications built from every fixture, at every status", () => {
  it("are built from more than a few documents, to be meaningful", () => {
    expect(mockDocuments.length).toBeGreaterThanOrEqual(6);
    expect(mockDocuments.some((d) => d.advocate !== null)).toBe(true);
    expect(mockDocuments.some((d) => d.findings.length > 0)).toBe(true);
    expect(everythingFor(mockDocuments[0]).length).toBeGreaterThan(0);
  });

  it("never name an advocate, before sign-off or after it, and carry none of the pipeline's machinery", () => {
    for (const doc of mockDocuments) {
      const markers = markersFor(doc);
      const built = everythingFor(doc);
      expect(leaked(built, markers.advocate), doc.id).toEqual([]);
      expect(leaked(built, markers.machinery), doc.id).toEqual([]);
      expect(leaked(built, [ADVOCATE]), doc.id).toEqual([]);
    }
  });

  it("never hold a number, so never a finding count the client was not given", () => {
    for (const doc of mockDocuments) {
      for (const n of everythingFor(doc)) {
        expect(withoutTitles(n.text), `${doc.id}: ${n.text}`).not.toMatch(/\d/);
      }
    }
  });

  it("never repeat an advocate's decision on a finding", () => {
    const decision = /\b(confirmed|overridden|overrid\w*|upheld|dismissed|rejected)\b/i;
    for (const doc of mockDocuments) {
      const notes = doc.findings.flatMap((f) => (f.overrideNote ? [f.overrideNote] : []));
      for (const n of everythingFor(doc)) {
        expect(n.text, doc.id).not.toMatch(decision);
        for (const note of notes) expect(n.text, doc.id).not.toContain(note);
      }
    }
  });

  it("never quote what was asked or answered", () => {
    for (const doc of mockDocuments) {
      const built = everythingFor(doc);
      expect(leaked(built, [QUESTION, ANSWER, "SENTINEL"]), doc.id).toEqual([]);
    }
    // And the request's own fields are not what the builder is given.
    for (const r of requests) {
      expect(Object.keys(r).sort()).toEqual(
        ["acceptedAt", "answeredAt", "documentId", "documentTitle", "id", "paidAt", "status"].sort(),
      );
    }
  });

  it("never point at a clause, so never at one the client has not been asked about", () => {
    for (const doc of mockDocuments) {
      const forbidden = [
        ...doc.findings.map((f) => f.clauseReference),
        ...doc.findings.map((f) => f.clauseText.slice(0, 24)),
        ...doc.clauses.map((c) => c.heading).filter((h) => h.length >= 4),
      ];
      for (const n of everythingFor(doc)) {
        const text = withoutTitles(n.text);
        expect(text, `${doc.id}: ${n.text}`).not.toMatch(/\bclauses?\b|\bsections?\b|\bs\.\s?\d/i);
        for (const f of forbidden) expect(text, doc.id).not.toContain(f);
      }
    }
  });

  it("open only the client's own document or its consultation page", () => {
    for (const doc of mockDocuments) {
      for (const n of everythingFor(doc)) {
        expect(n.href).toMatch(/^\/documents\/[^/]+(\/consultation)?$/);
        expect(n.href.startsWith(`/documents/${n.documentId}`)).toBe(true);
      }
    }
  });
});

describe("what each state says", () => {
  const summary = (id: string) => shapeClientSummary(mockDocuments.find((d) => d.id === id)!);
  const kinds = (docs: ReturnType<typeof notifiableDocument>[]) =>
    buildClientNotifications(docs, []).map((n) => n.kind);

  it("says a screened document waits for its fee", () => {
    const doc = summary("doc-vendor-awaiting-payment");
    expect(doc.status).toBe("awaiting_payment");
    expect(buildClientNotifications([notifiableDocument(doc)], [])).toMatchObject([
      {
        kind: "awaiting_payment",
        text: `${doc.title} is screened. Pay the fee to send it to an advocate.`,
        href: `/documents/${doc.id}`,
      },
    ]);
  });

  it("says that the advocate asked, only while a request is open, and not how many", () => {
    const doc = summary("doc-vendor-revision");
    expect(doc.status).toBe("revision");
    expect(doc.openRequests).toBeGreaterThan(0);
    const [asked] = buildClientNotifications([notifiableDocument(doc)], []);
    expect(asked).toMatchObject({
      kind: "advocate_asked",
      text: `Your advocate asked for your answer on ${doc.title}.`,
    });
    expect(kinds([notifiableDocument({ ...doc, openRequests: 0 })])).toEqual([]);
    // One and several are said the same.
    expect(buildClientNotifications([notifiableDocument({ ...doc, openRequests: 5 })], [])[0].text).toBe(
      asked.text,
    );
  });

  it("says a document is with an advocate, without saying which", () => {
    expect(kinds([notifiableDocument(summary("doc-msa-pending"))])).toEqual(["with_advocate"]);
  });

  it("says a document is settled, with the time of the recorded sign-off", () => {
    const doc = summary("doc-nda-settled");
    expect(doc.signOff).not.toBeNull();
    expect(buildClientNotifications([notifiableDocument(doc)], [])).toMatchObject([
      { kind: "settled", at: doc.signOff!.at, href: `/documents/${doc.id}` },
    ]);
  });

  it("says nothing of a settled document that has no sign-off time on record", () => {
    const doc = notifiableDocument(summary("doc-nda-settled"));
    expect(kinds([{ ...doc, signedOffAt: null }])).toEqual([]);
  });

  it("says nothing of a document still being screened, or one already executed", () => {
    expect(kinds([notifiableDocument(summary("doc-employment-analysing"))])).toEqual([]);
    expect(kinds([notifiableDocument(summary("doc-nda-executed"))])).toEqual([]);
  });

  it("says that a consultation request was accepted, or answered, and nothing else of it", () => {
    const built = buildClientNotifications([], requests);
    expect(built.map((n) => [n.kind, n.id])).toEqual([
      ["consultation_answered", "consultation_answered:c-answered"],
      ["consultation_accepted", "consultation_accepted:c-accepted"],
    ]);
    expect(built[1].text).toBe(
      `Your advocate accepted your consultation request on ${CONSULTED_TITLE}. Pay the fee to go ahead.`,
    );
    expect(built.every((n) => n.href === "/documents/doc-nda-settled/consultation")).toBe(true);
  });

  it("is silent on a request that is open, declined, or paid and waiting for its answer", () => {
    const quiet = ["c-requested", "c-declined", "c-paid"];
    const built = buildClientNotifications([], requests.filter((r) => quiet.includes(r.id)));
    expect(built).toEqual([]);
  });

  it("does not call an answer an answer until it is paid for", () => {
    const unpaid = notifiableConsultation(
      shapeClientConsultation(
        consultation({ id: "c-odd", status: "answered", answeredAt: "2026-10-04T09:00:00.000Z" }),
      ),
    );
    expect(buildClientNotifications([], [unpaid])).toEqual([]);
  });

  it("lists the newest first, the same way every time", () => {
    const docs = mockDocuments.map((d) => notifiableDocument(shapeClientSummary(d)));
    const built = buildClientNotifications(docs, requests);
    const times = built.map((n) => n.at);
    expect([...times].sort().reverse()).toEqual(times);
    expect(buildClientNotifications([...docs].reverse(), [...requests].reverse())).toEqual(built);
  });
});

describe("the files that build notifications", () => {
  const root = path.resolve(__dirname, "..");
  const files = ["lib/notifications.ts", "lib/api/client/notifications.ts"];

  it("read no finding, no clause, no advocate and no question or answer", () => {
    for (const f of files) {
      const source = readFileSync(path.join(root, f), "utf8");
      expect(source, f).not.toMatch(
        /\.question\b|\.answer\b|\.findings\b|\.findingList\b|\.findingCount\b|\.clauses\b|\.advocateName\b|signOff\??\.advocate|\bContractDocument\b|api\/consultations"/,
      );
    }
  });

  it("read the client layer and nothing internal", () => {
    const source = readFileSync(path.join(root, "lib/api/client/notifications.ts"), "utf8");
    const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    for (const spec of imports) {
      expect(spec, spec).toMatch(/^(@\/lib\/notifications|@\/lib\/types|\.\/consultations|\.\/documents)$/);
    }
  });
});
