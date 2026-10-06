import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClauseBlock } from "@/components/document/clause-block";
import { ClientReader } from "@/components/document/client-reader";
import { PaletteProvider } from "@/components/shared/command-palette";
import { shapeClientDocument } from "./api/client/shape-document";
import { mockDocuments } from "./mock/documents.mock";
import type { ClientSettlementNote, DocumentStatus } from "./types";

// The tests compile JSX the classic way, which looks for React in scope (see clientScreens.test.ts).
(globalThis as { React?: typeof React }).React = React;

/**
 * The advocate's notes to the client, as the client reads them: in the margin of the
 * clause they are about, in the advocate's own words, once the document is signed off.
 */

const NOTE = "READER-NOTE-text-for-this-clause";
const doc = mockDocuments.find((d) => d.id === "doc-nda-settled")!;
const client = shapeClientDocument(doc);
const first = client.clauses[0];
const released: ClientSettlementNote = {
  id: "settlement-note-1",
  clauseNumber: first.number,
  text: NOTE,
  releasedAt: "2026-08-06T09:00:00.000Z",
};

// The workspace reads the command palette, which the portal's shell provides.
const reader = (over: Partial<Parameters<typeof ClientReader>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(
      PaletteProvider,
      null,
      createElement(ClientReader, {
        doc: client,
        trail: [],
        back: { href: "/documents", label: "Documents" },
        ...over,
      }),
    ),
  );

describe("a released note, in the clause's margin", () => {
  const clause = doc.clauses[0];
  const block = (settlementNotes?: { items: ClientSettlementNote[]; label: string }) =>
    renderToStaticMarkup(
      createElement(ClauseBlock, {
        clause,
        findings: [],
        findingNumbers: {},
        selectedFindingId: null,
        hoveredFindingId: null,
        onSelectFinding: () => {},
        onHoverFinding: () => {},
        settlementNotes,
      }),
    );

  it("is shown under the label it is given, as written, with the day it was released", () => {
    const html = block({ items: [released], label: "Your advocate's note · Rhea Kapoor" });
    expect(html).toContain("Your advocate&#x27;s note · Rhea Kapoor");
    expect(html).toContain(NOTE);
    expect(html).toContain("6 Aug 2026");
    expect(html).toContain(`Clause ${clause.number}`);
  });

  it("leaves a clause with no note as it was, with no margin and no sign that there might be one", () => {
    const without = block(undefined);
    expect(block({ items: [], label: "Your advocate's note" })).toBe(without);
    expect(without).not.toContain("advocate");
  });
});

describe("the client's reader", () => {
  it("shows a signed-off document's released note beside its clause, named by the sign-off record", () => {
    expect(client.signOff).not.toBeNull();
    const html = reader({ settlementNotes: [released] });
    expect(html).toContain(NOTE);
    expect(html).toContain(`Your advocate&#x27;s note · ${client.signOff!.advocate}`);
  });

  it("shows no note when none was released, and says nothing of them", () => {
    const html = reader({ settlementNotes: [] });
    expect(html).not.toContain("Your advocate&#x27;s note");
    expect(html).not.toContain(NOTE);
  });

  it("shows no note on a document that is not signed off, even if a caller hands it one", () => {
    const statuses: DocumentStatus[] = ["under_review", "revision", "pending_review"];
    for (const status of statuses) {
      const unsigned = { ...client, status, signOff: null };
      const html = reader({ doc: unsigned, settlementNotes: [released] });
      expect(html, status).not.toContain(NOTE);
      expect(html, status).not.toContain("Your advocate&#x27;s note");
    }
  });
});

describe("where the client's pages read them", () => {
  const root = path.resolve(__dirname, "..");
  const read = (f: string) => readFileSync(path.join(root, f), "utf8");

  it("loads them with the document, through the client layer, and passes them to the reader", () => {
    const page = read("app/(client)/documents/[id]/page.tsx");
    expect(page).toMatch(/getClientSettlementNotes\(ORG, params\.id\)/);
    expect(page).toMatch(/settlementNotes=\{notes\}/);
    expect(page).not.toMatch(/\.settlementNotes\b/);
  });

  it("show them on the delivery from the delivery itself, and only when there are some", () => {
    const delivery = read("app/(client)/documents/[id]/delivery/page.tsx");
    expect(delivery).toMatch(/delivery\.settlementNotes\.length > 0/);
    expect(delivery).not.toMatch(/ContractDocument|lib\/api\/documents|lib\/api\/settlement-notes"/);
  });

  it("read nothing of the advocate's side in the reader or the shared note view", () => {
    for (const f of ["components/document/client-reader.tsx", "components/document/settlement-note-view.tsx"]) {
      expect(read(f), f).not.toMatch(/lib\/api\/settlement-notes|lib\/api\/notes|AdvocateNote|shareWithClient/);
    }
  });
});
