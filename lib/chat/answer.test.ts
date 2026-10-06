import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { shapeClientDocument } from "@/lib/api/client/shape-document";
import { summaryResultFor } from "@/lib/api/summaries";
import { mockDocuments } from "@/lib/mock/documents.mock";
import type { ClientSettlementNote, ContractDocument } from "@/lib/types";
import { NOT_FOUND_TEXT, REPHRASE_TEXT, WITHDRAWN_TEXT, answerQuestion, withdrawnReplyCount } from "./answer";
import { classifyQuestion } from "./classify";
import type { ChatSource, Generator } from "./generate";
import { findReferences } from "./references";
import { QUESTIONS } from "./questions.fixtures";

/**
 * The whole path a question takes: the gate, the grounded reply, the check. Held
 * on what the client is finally shown, which is the only thing that matters.
 */

const settled = mockDocuments.filter((d) => d.status === "settled" || d.status === "executed");

function sourceOf(doc: ContractDocument, settlementNotes: ClientSettlementNote[] = []): ChatSource {
  const client = shapeClientDocument(doc);
  const read = summaryResultFor(doc);
  return {
    title: client.title,
    clauses: client.clauses,
    summary: read.state === "ready" ? read.summary : null,
    settlementNotes,
  };
}

const source = sourceOf(settled[0]);
const first = source.clauses[0];

/** A generator that must never be asked: if the gate lets a question by, this fails the test. */
const neverAsked: Generator = () => {
  throw new Error("The generator was asked.");
};

describe("a question that asks for advice", () => {
  it("is never given to the generator, and is sent to the advocate with nothing written", () => {
    for (const x of QUESTIONS.filter((x) => x.expected === "advise")) {
      const reply = answerQuestion(x.text, source, { generate: neverAsked });
      expect(reply, x.text).toEqual({ kind: "escalation", text: "", citedClauseReference: null, isEscalation: true });
    }
  });
});

describe("a question that is unclear or in words the gate does not read", () => {
  it("is not given to the generator, is asked to be put again, and is not offered a consultation", () => {
    for (const x of QUESTIONS.filter((x) => x.expected === "unclear")) {
      const reply = answerQuestion(x.text, source, { generate: neverAsked });
      expect(reply, x.text).toEqual({ kind: "rephrase", text: REPHRASE_TEXT, citedClauseReference: null, isEscalation: false });
    }
    // No upsell, in the words or in the shape of the reply.
    expect(REPHRASE_TEXT).not.toMatch(/consult|advocate|fee|book|pay/i);
  });
});

describe("a question that asks what the document says", () => {
  it("is answered from the clause it names, quoted as written, and the reply links to it", () => {
    const reply = answerQuestion(`What does clause ${first.number} say?`, source);
    expect(reply.kind).toBe("answer");
    expect(reply.text).toContain(first.body.split("\n\n")[0]);
    expect(reply.citedClauseReference).toBe(`Clause ${first.number}`);
    expect(reply.isEscalation).toBe(false);
  });

  it("is told so when the document has nothing to answer it from, and nothing is made up", () => {
    const reply = answerQuestion("What is a zzz?", source);
    expect(reply).toEqual({ kind: "not_found", text: NOT_FOUND_TEXT, citedClauseReference: null, isEscalation: false });
  });

  it("is answered, over every explain question, only with text the document, its summary or a note holds", () => {
    for (const d of settled) {
      const s = sourceOf(d, [{ id: "note-1", clauseNumber: sourceOf(d).clauses[0].number, text: "Check the names against your records.", releasedAt: "2026-08-06T09:00:00.000Z" }]);
      const allowed = [s.title, ...s.clauses.flatMap((c) => [c.heading, c.body]), ...(s.summary?.items.flatMap((i) => [i.label, i.text]) ?? []), "Check the names against your records."].join("\n");
      const asks = [
        ...QUESTIONS.filter((x) => x.expected === "explain").map((x) => x.text),
        ...s.clauses.flatMap((c) => [`What does clause ${c.number} say?`, c.heading]),
      ];
      for (const question of asks) {
        const reply = answerQuestion(question, s);
        expect(["answer", "not_found", "rephrase"], `${d.id}: ${question}`).toContain(reply.kind);
        for (const ref of findReferences(reply.text)) expect(allowed, `${d.id}: ${question} gave ${ref}`).toContain(ref);
      }
    }
  });
});

describe("a reply the check refuses", () => {
  const advising: Generator = () => ({
    found: true,
    text: "You should negotiate this before you sign. SECRET-GENERATOR-TEXT",
    grounds: [{ kind: "clause", number: first.number }],
    quotes: [],
    citedClauseReference: `Clause ${first.number}`,
  });

  it("is replaced by a fixed message, and nothing the generator wrote is shown", () => {
    const before = withdrawnReplyCount();
    const reasons: string[] = [];
    const reply = answerQuestion(`What does clause ${first.number} say?`, source, {
      generate: advising,
      onWithdrawn: (r) => reasons.push(r),
    });
    expect(reply).toEqual({ kind: "withdrawn", text: WITHDRAWN_TEXT, citedClauseReference: null, isEscalation: false });
    expect(JSON.stringify(reply)).not.toContain("SECRET-GENERATOR-TEXT");
    expect(reasons).toEqual(["advice_phrasing"]);
    expect(withdrawnReplyCount()).toBe(before + 1);
  });

  it("is not an offer of a consultation either: a withdrawn reply is not a sale", () => {
    expect(WITHDRAWN_TEXT).not.toMatch(/consult|fee|book|pay/i);
  });

  it("also covers a working note's text being echoed, when the caller names it", () => {
    const leaky: Generator = () => ({ ...advising(first.heading, source), text: `Clause ${first.number}. WORKING-ECHO-xq7` });
    const reply = answerQuestion(`What does clause ${first.number} say?`, source, { generate: leaky, forbidden: ["WORKING-ECHO-xq7"] });
    expect(reply.kind).toBe("withdrawn");
    expect(reply.text).not.toContain("WORKING-ECHO-xq7");
  });
});

describe("the gate and the pipeline agree", () => {
  it("send to the advocate exactly the questions the classifier calls advice, and nothing else", () => {
    for (const x of QUESTIONS) {
      const reply = answerQuestion(x.text, source);
      expect(reply.isEscalation, x.text).toBe(classifyQuestion(x.text) === "advise");
    }
  });
});

describe("the modules that make the agent", () => {
  const root = path.resolve(__dirname, "..", "..");
  const files = readdirSync(path.join(root, "lib", "chat"))
    .filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))
    .map((f) => `lib/chat/${f}`);

  it("are found, to be meaningful", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it("read what a client is handed and nothing internal: no record, no finding, no advocate's side", () => {
    for (const f of files) {
      const text = readFileSync(path.join(root, f), "utf8");
      expect(text, f).not.toMatch(
        /\bContractDocument\b|\bFinding\b[^s]|lib\/api\/(?!client)|lib\/findings|lib\/audit|lib\/mock\/documents|AdvocateNote|overrideNote|ruleApplied|\.question\b|\.answer\b/,
      );
    }
  });

  it("hold no explanation of the law of their own", () => {
    for (const f of files.filter((f) => !f.endsWith("references.ts") && !f.endsWith("questions.fixtures.ts"))) {
      const text = readFileSync(path.join(root, f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(findReferences(text), f).toEqual([]);
    }
  });
});
