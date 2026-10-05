import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CitationBlock } from "@/components/document/citation-block";

// The tests compile JSX the classic way, which looks for React in scope. Giving it here keeps
// the test config as it is, and is only for rendering a component to text.
(globalThis as { React?: typeof React }).React = React;
import { workspaceDocOf, workspaceNumbering } from "./client-workspace";
import { groupOf, yourMove } from "./moves";
import { leaked, markersFor } from "./api/client/markers";
import { shapeClientDocument, shapeClientSummary } from "./api/client/shape-document";
import { lifecycle, stageCaption } from "@/components/document/provenance";
import { mockDocuments } from "./mock/documents.mock";

/**
 * The client screens that have moved onto what a client is handed.
 *
 * A screen that reads the document's own record can be shown a field it may not
 * see. These hold the migrated screens to the client types: by what they say, and
 * by what they import. The lint fence replaces the second part when the internal
 * reads are moved (phase 4); until then this is the guard.
 */

const root = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

/** Files that have moved. Add a screen here when it moves. */
const MIGRATED = [
  "app/(client)/documents/page.tsx",
  "app/(client)/documents/[id]/page.tsx",
  "app/(client)/documents/[id]/checklist/page.tsx",
  "app/(client)/documents/[id]/delivery/page.tsx",
  "app/(client)/documents/[id]/summary/page.tsx",
  "app/(client)/documents/[id]/chat/page.tsx",
  "app/(client)/documents/[id]/consultation/page.tsx",
  "app/(client)/settings/privacy/page.tsx",
  "lib/privacy.ts",
  "components/document/document-agent.tsx",
  "lib/mock/chat.mock.ts",
  "components/document/change-requests.tsx",
  "components/document/client-reader.tsx",
  "components/document/provenance.tsx",
  "components/domain/coverage-panel.tsx",
  "components/domain/document-context.tsx",
  "components/domain/payment-panel.tsx",
  "lib/moves.ts",
];

describe("the migrated client screens", () => {
  it("lists the files it guards", () => {
    expect(MIGRATED.length).toBeGreaterThan(5);
  });

  it("read no internal record and call no internal function", () => {
    // The internal reads, the advocate's writes, the full trail, the helpers that narrow in the browser.
    const internal =
      /@\/lib\/api\/documents"|@\/lib\/audit"|@\/lib\/findings"|\bContractDocument\b|\bbuildAuditTrail\b|\bclientVisibleFindings\b/;
    const offenders = MIGRATED.filter((f) => internal.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("never say who the advocate is from the document: only the sign-off record names them", () => {
    const names = /\bdoc\.advocate\b|\.advocate\?\.name|\.advocate\.name|\.advocate\.bar|requestedBy/;
    const offenders = MIGRATED.filter((f) => names.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe("where a document is in its life, as a client reads it", () => {
  const withAdvocate = mockDocuments.filter((d) => d.advocate !== null);

  it("holds fixtures with an advocate on them, to be meaningful", () => {
    expect(withAdvocate.length).toBeGreaterThanOrEqual(3);
  });

  it("names the advocate only once there is a sign-off record, in every fixture", () => {
    for (const d of mockDocuments) {
      const summary = shapeClientSummary(d);
      const markers = markersFor(d);
      const shown = {
        stages: lifecycle(summary),
        caption: stageCaption(summary),
        group: groupOf(summary),
        move: yourMove(summary),
      };
      expect(leaked(shown, markers.machinery), d.id).toEqual([]);
      if (summary.signOff === null) {
        expect(leaked(shown, markers.advocate), d.id).toEqual([]);
      }
    }
  });

  it("reads the same for a document and its summary", () => {
    for (const d of mockDocuments) {
      expect(lifecycle(shapeClientDocument(d)), d.id).toEqual(lifecycle(shapeClientSummary(d)));
    }
  });

  it("says that the advocate asked, and nothing of where the request now stands", () => {
    const vendor = shapeClientSummary(mockDocuments.find((d) => d.id === "doc-vendor-revision")!);
    expect(yourMove(vendor)?.note).toBe("Your advocate asked for your answer");
    expect(yourMove({ ...vendor, openRequests: 3 })?.note).toBe(
      "Your advocate asked for your answer on 3 requests",
    );
  });
});

describe("a signed-off document, as the shared workspace reads it for a client", () => {
  const signedOff = mockDocuments.filter((d) => d.status === "settled" || d.status === "executed");

  it("holds the signed-off fixtures", () => {
    expect(signedOff.length).toBeGreaterThanOrEqual(2);
  });

  it("is built from what a client has, and carries none of the machinery", () => {
    for (const d of signedOff) {
      const client = shapeClientDocument(d);
      const adapted = workspaceDocOf(client);
      expect(leaked(adapted, markersFor(d).machinery), d.id).toEqual([]);
      // The advocate's working is not there to be filled with an empty value: the keys are absent.
      expect(Object.keys(adapted).sort(), d.id).toEqual([
        "advocate",
        "clauses",
        "clientName",
        "counterpartyName",
        "executionSteps",
        "findings",
        "id",
        "status",
        "tier",
        "title",
        "type",
        "version",
      ]);
      for (const f of adapted.findings) {
        for (const key of ["ruleApplied", "layer", "overrideNote", "resolvedAt"]) {
          expect(Object.keys(f), `${d.id} ${key}`).not.toContain(key);
        }
        if (f.changeRequest) expect(Object.keys(f.changeRequest)).not.toContain("requestedBy");
      }
    }
  });

  it("holds each finding under its client number, which is the number it is shown by", () => {
    for (const d of signedOff) {
      const client = shapeClientDocument(d);
      const adapted = workspaceDocOf(client);
      expect(adapted.findings.map((f) => f.findingId)).toEqual(client.findingList.map((f) => f.number));
      expect(workspaceNumbering(client)).toEqual(
        Object.fromEntries(client.findingList.map((f) => [f.number, f.number])),
      );
    }
  });

  it("names the advocate once, from the sign-off record", () => {
    for (const d of signedOff) {
      const client = shapeClientDocument(d);
      const adapted = workspaceDocOf(client);
      // Named and enrolled, and with no id of the advocate's own.
      expect(adapted.advocate).toEqual({ name: client.signOff!.advocate, bar: client.signOff!.enrolment });
    }
  });

  it("says that a source was withdrawn and not why", () => {
    const client = shapeClientDocument(signedOff[0]);
    const withdrawn = {
      ...client,
      findingList: client.findingList.map((f, i) =>
        i === 0 && f.detail
          ? {
              ...f,
              detail: {
                ...f.detail,
                citations: [
                  ...f.detail.citations,
                  { id: "c-w", text: "A source", status: "blocked" as const, corpusRef: null, withdrawn: true },
                ],
              },
            }
          : f,
      ),
    };
    const citation = workspaceDocOf(withdrawn).findings[0].citations.at(-1)!;
    // That it was withdrawn, and nothing of who, when or why.
    expect(citation.withdrawn).toEqual({});
  });

  it("is drawn without a name or a date for a source withdrawn, and does not fall over for want of one", () => {
    const html = renderToStaticMarkup(
      createElement(CitationBlock, {
        citations: [{ id: "c-w", text: "A source, s.1", status: "blocked", corpusRef: null, withdrawn: {} }],
        showWithdrawalNote: false,
      }),
    );
    expect(html).toContain("Withdrawn. The finding no longer relies on this source.");
    expect(html).not.toMatch(/Invalid|NaN| by /);
  });

  it("still says who withdrew a source, when and why, for an advocate", () => {
    const html = renderToStaticMarkup(
      createElement(CitationBlock, {
        citations: [
          {
            id: "c-w",
            text: "A source, s.1",
            status: "blocked",
            corpusRef: null,
            withdrawn: { by: "Rhea Kapoor", at: "2026-09-01T12:00:00.000Z", note: "Not relied on." },
          },
        ],
        showWithdrawalNote: true,
      }),
    );
    expect(html).toContain("Withdrawn by Rhea Kapoor · 1 Sep 2026.");
    expect(html).toContain("Not relied on.");
  });
});
