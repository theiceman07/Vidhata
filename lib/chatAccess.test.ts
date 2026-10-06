import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocumentAgent } from "@/components/document/document-agent";
import { shapeClientDocument } from "./api/client/shape-document";
import { agentAvailable } from "./chatAccess";
import { mockDocuments } from "./mock/documents.mock";
import type { ClientDocument, DocumentStatus } from "./types";

// The tests compile JSX the classic way, which looks for React in scope (see clientScreens.test.ts).
(globalThis as { React?: typeof React }).React = React;

/**
 * The document agent explains the settled document, so it must not appear before
 * sign-off, on any screen, for any document in any state. These render the real
 * component and fail if it shows.
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

const signedOff = (d: Pick<ClientDocument, "status" | "signOff">) =>
  d.signOff !== null && (d.status === "settled" || d.status === "executed");

const render = (doc: ClientDocument) =>
  renderToStaticMarkup(createElement(DocumentAgent, { doc, onCite: () => {} }));

describe("when the document agent is available", () => {
  it("holds fixtures that are signed off and fixtures that are not, to be meaningful", () => {
    const docs = mockDocuments.map((d) => shapeClientDocument(d));
    expect(docs.some(signedOff)).toBe(true);
    expect(docs.some((d) => !signedOff(d))).toBe(true);
  });

  it("is a yes only for a document that is signed off, in every fixture at every status", () => {
    for (const d of mockDocuments) {
      const base = shapeClientDocument(d);
      for (const status of STATUSES) {
        const doc = { ...base, status };
        expect(agentAvailable(doc), `${d.id} as ${status}`).toBe(signedOff(doc));
      }
    }
  });

  it("is a no for a document that says it is settled but has no sign-off on record", () => {
    for (const d of mockDocuments) {
      const doc = { ...shapeClientDocument(d), status: "settled" as const, signOff: null };
      expect(agentAvailable(doc), d.id).toBe(false);
    }
  });
});

describe("the document agent, rendered", () => {
  it("shows nothing at any status before sign-off, for any fixture", () => {
    for (const d of mockDocuments) {
      const base = shapeClientDocument(d);
      for (const status of STATUSES) {
        const doc = { ...base, status };
        if (signedOff(doc)) continue;
        expect(render(doc), `${d.id} as ${status}`).toBe("");
      }
      // Settled on its face, with no recorded sign-off: still nothing.
      expect(render({ ...base, status: "settled", signOff: null }), `${d.id} unsigned`).toBe("");
    }
  });

  it("shows for a signed-off document", () => {
    const settled = mockDocuments.filter((d) => d.status === "settled" || d.status === "executed");
    expect(settled.length).toBeGreaterThan(0);
    for (const d of settled) {
      const doc = shapeClientDocument(d);
      expect(signedOff(doc), d.id).toBe(true);
      expect(render(doc), d.id).toContain("Ask about this document");
    }
  });
});

describe("where the agent is put", () => {
  const root = path.resolve(__dirname, "..");
  const read = (f: string) => readFileSync(path.join(root, f), "utf8");

  it("is mounted on the document page only inside the signed-off view", () => {
    const page = read("app/(client)/documents/[id]/page.tsx");
    expect([...page.matchAll(/<DocumentAgent\b/g)]).toHaveLength(1);
    // The one mount sits inside SettledDocument: after it begins, with no other component between.
    const settledView = page.indexOf("function SettledDocument");
    const mount = page.indexOf("<DocumentAgent");
    expect(settledView).toBeGreaterThan(-1);
    expect(mount).toBeGreaterThan(settledView);
    expect(page.slice(settledView, mount)).not.toMatch(/\nfunction \w+\(/);
  });

  it("is refused by the chat page through the one rule, and the unavailable view names nothing", () => {
    const chat = read("app/(client)/documents/[id]/chat/page.tsx");
    const gate = chat.indexOf("agentAvailable(doc)");
    expect(gate).toBeGreaterThan(-1);
    // From the check to the end of its one sentence.
    const unavailable = chat.slice(gate, chat.indexOf("</p>", gate));
    expect(unavailable).toContain("PageHeader");
    expect(unavailable).not.toMatch(/doc\.title/);
  });
});
