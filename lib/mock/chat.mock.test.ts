import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { summaryResultFor } from "@/lib/api/summaries";
import { shapeClientDocument } from "@/lib/api/client/shape-document";
import { buildInitialMessages, getMockReply, SUGGESTED_QUESTIONS } from "./chat.mock";
import { CORPUS } from "./corpus.mock";
import { mockDocuments } from "./documents.mock";
import type { ContractDocument, SettledSummary } from "@/lib/types";

/**
 * The agent explains the settled document, and CLAUDE.md forbids any statute
 * text, section number or case name that is not in a fixture. These hold every
 * reply to that: a reference is in a reply only if the document's own text, its
 * summary or the corpus has it.
 */

// What looks like a reference to the law: a section, an Act, a case.
const SECTION = /\b(?:Sections?|Sec\.|Articles?|Rules?|Orders?)\s+\d+[A-Za-z]?(?:\(\w+\))*/g;
const SHORT = /\bss?\.\s?\d+[A-Za-z]?(?:\(\w+\))*/g;
const ACT = /\b(?:[A-Z][A-Za-z&()'-]*\s+){0,8}Act,?\s+(?:of\s+)?\d{4}\b/g;
const CASE = /\b[A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*)*\s+(?:v\.?|vs\.?)\s+[A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*)*/g;

function references(text: string): string[] {
  return [SECTION, SHORT, ACT, CASE].flatMap((re) => [...text.matchAll(re)].map((m) => m[0].trim()));
}

/** The text a reply about this document may draw its references from. */
function fixtureText(doc: ContractDocument, summary: SettledSummary | null): string {
  return [
    doc.title,
    ...doc.clauses.flatMap((c) => [c.heading, c.body]),
    ...(summary?.items.flatMap((i) => [i.label, i.text]) ?? []),
    ...CORPUS.flatMap((e) => [e.label, e.ref]),
  ].join("\n");
}

const settled = mockDocuments.filter((d) => d.status === "settled" || d.status === "executed");

/** What a client might ask, including the questions that tempt an agent to explain the law. */
const TERM_QUESTIONS = [
  "What's a non-compete clause?",
  "What is MSME?",
  "What does the Indian Contract Act say about this?",
  "Explain section 27",
  "Which case decided this?",
  "Is this enforceable in court?",
  "What does arbitration mean?",
  "zzz",
  "",
];

function repliesFor(doc: ContractDocument): { question: string; text: string }[] {
  const client = shapeClientDocument(doc);
  const read = summaryResultFor(doc);
  const summary = read.state === "ready" ? read.summary : null;
  const questions = [
    ...SUGGESTED_QUESTIONS,
    ...TERM_QUESTIONS,
    "Give me an overview",
    "Summarise this document",
    ...doc.clauses.flatMap((c) => [`What does clause ${c.number} mean?`, `Explain ${c.heading}`, c.heading]),
  ];
  // Both with the summary and without it: the agent still answers when it could not be read.
  return questions.flatMap((question) => [
    { question, text: getMockReply(question, client, summary).text },
    { question, text: getMockReply(question, client, null).text },
  ]);
}

describe("the agent's replies", () => {
  it("are read over signed-off documents that have a summary and ones that do not, to be meaningful", () => {
    expect(settled.length).toBeGreaterThanOrEqual(2);
    expect(settled.some((d) => summaryResultFor(d).state === "ready")).toBe(true);
    expect(repliesFor(settled[0]).some((r) => r.text !== "")).toBe(true);
  });

  it("hold no section number, Act or case that is not in the document, its summary or the corpus", () => {
    for (const doc of settled) {
      const read = summaryResultFor(doc);
      const allowed = fixtureText(doc, read.state === "ready" ? read.summary : null);
      for (const { question, text } of repliesFor(doc)) {
        for (const ref of references(text)) {
          expect(allowed, `${doc.id}: "${question}" gave "${ref}"`).toContain(ref);
        }
      }
    }
  });

  it("would fail on the statute explanations the mock used to hold", () => {
    // The two glossary entries that were removed. The check has to catch them.
    const old = [
      "Indian courts read these narrowly under Section 27 of the Indian Contract Act, 1872, which voids restraints on trade.",
      "The MSMED Act, 2006 gives registered MSMEs statutory protection on payment timelines.",
    ];
    for (const doc of settled) {
      const read = summaryResultFor(doc);
      const allowed = fixtureText(doc, read.state === "ready" ? read.summary : null);
      for (const text of old) {
        expect(references(text).some((r) => !allowed.includes(r)), `${doc.id}: ${text}`).toBe(true);
      }
    }
  });

  it("quote a named clause as it is written, and cite it", () => {
    const doc = settled[0];
    const client = shapeClientDocument(doc);
    const clause = doc.clauses[0];
    const reply = getMockReply(`What does clause ${clause.number} mean?`, client);
    expect(reply.text).toContain(clause.body.split("\n\n")[0]);
    expect(reply.citedClauseReference).toBe(`Clause ${clause.number}`);
    expect(reply.isEscalation).toBe(false);
  });

  it("add the summary's own line for a clause it covers, and nothing else", () => {
    for (const doc of settled) {
      const read = summaryResultFor(doc);
      if (read.state !== "ready") continue;
      const client = shapeClientDocument(doc);
      for (const item of read.summary.items.filter((i) => i.clauses.length > 0)) {
        const number = item.clauses[0];
        const reply = getMockReply(`clause ${number}`, client, read.summary);
        expect(reply.text, `${doc.id} clause ${number}`).toContain(item.text);
      }
    }
  });

  it("answer an overview question from the summary's own labels", () => {
    for (const doc of settled) {
      const read = summaryResultFor(doc);
      if (read.state !== "ready") continue;
      const reply = getMockReply("What does this document cover?", shapeClientDocument(doc), read.summary);
      for (const item of read.summary.items) expect(reply.text).toContain(item.label);
      expect(reply.citedClauseReference).toBeNull();
    }
  });

  it("tell a question about a term the document does not use that they can only explain the document", () => {
    for (const doc of settled) {
      const client = shapeClientDocument(doc);
      const headings = client.clauses.map((c) => c.heading.toLowerCase());
      // A term that is neither a heading nor a word of one.
      expect(headings.some((h) => h.includes("zzz"))).toBe(false);
      const reply = getMockReply("What is a zzz?", client, null);
      expect(reply.text).toMatch(/only explain what this settled document says/);
      expect(reply.citedClauseReference).toBeNull();
    }
  });

  it("send a question that asks what to do to the advocate, with no text of their own", () => {
    const client = shapeClientDocument(settled[0]);
    for (const q of ["Should I sue them?", "Can I win this?", "What should I do?"]) {
      expect(getMockReply(q, client, null)).toEqual({
        text: "",
        citedClauseReference: null,
        isEscalation: true,
      });
    }
  });
});

describe("the mock's own source", () => {
  const source = readFileSync(path.resolve(__dirname, "chat.mock.ts"), "utf8")
    // Comments may say what is forbidden; only the code is held to it.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("holds no glossary and no reference to the law", () => {
    expect(source).not.toMatch(/TERM_DEFINITIONS|findTermDefinition/);
    expect(references(source)).toEqual([]);
  });

  it("opens with no reference to the law either", () => {
    for (const doc of settled) {
      for (const m of buildInitialMessages(shapeClientDocument(doc))) {
        expect(references(m.text)).toEqual([]);
      }
    }
  });
});
