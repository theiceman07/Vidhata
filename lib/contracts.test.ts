import { describe, expect, it } from "vitest";
import { chatReplySchema, chatRequestSchema, layerSchema, reviewFindingSchema } from "./contracts";
import { BACKEND_EXAMPLE_FINDING } from "./mock/r1-backend-example.fixture";

const id = "11111111-1111-4111-8111-111111111111";

const good = {
  finding_id: id,
  layer: "STATUTORY",
  severity: "high",
  clause_reference: "Clause 7.2",
  description: "Void non-compete",
  rule_applied: "ICA_S27_NONCOMPETE_V2",
  remedy_suggested: "Narrow it.",
  citation: "Indian Contract Act, 1872, s.27",
};

describe("R1 finding contract", () => {
  it("accepts a finding and fills the status", () => {
    const f = reviewFindingSchema.parse(good);
    expect(f.status).toBe("pending");
    expect(f.layer).toBe(2);
    expect(f.citation).toBe("Indian Contract Act, 1872, s.27");
  });
  it("names the rule rule_applied, as the database does", () => {
    const f = reviewFindingSchema.parse(good);
    expect(f.rule_applied).toBe("ICA_S27_NONCOMPETE_V2");
    expect("rule_id" in f).toBe(false);
  });
  it.each(["low", "medium", "high", "critical"])("accepts severity %s", (severity) => {
    expect(reviewFindingSchema.safeParse({ ...good, severity }).success).toBe(true);
  });
  it.each(["pending", "confirmed", "overridden", "added"])("accepts status %s", (status) => {
    expect(reviewFindingSchema.safeParse({ ...good, status }).success).toBe(true);
  });
  it("rejects an unknown severity and an unknown status", () => {
    expect(reviewFindingSchema.safeParse({ ...good, severity: "urgent" }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({ ...good, severity: "info" }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({ ...good, status: "approved" }).success).toBe(false);
  });
  it("holds the citation to one non-empty string", () => {
    expect(reviewFindingSchema.safeParse({ ...good, citation: "" }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({ ...good, citation: "   " }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({ ...good, citation: [{ text: "x", verified: true }] }).success).toBe(false);
    const without: Record<string, unknown> = { ...good };
    delete without.citation;
    expect(reviewFindingSchema.safeParse(without).success).toBe(false);
  });
  it.each(["clause_reference", "description", "rule_applied", "remedy_suggested"])("requires %s", (key) => {
    const bad: Record<string, unknown> = { ...good };
    delete bad[key];
    expect(reviewFindingSchema.safeParse(bad).success).toBe(false);
  });
  it("holds the rule to an UPPER_SNAKE id", () => {
    expect(reviewFindingSchema.safeParse({ ...good, rule_applied: "ICA-S27-NONCOMPETE-V2" }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({ ...good, rule_applied: "lower_case" }).success).toBe(false);
  });
  it("has no verified or corpus_ref in what it returns", () => {
    const f = reviewFindingSchema.parse({ ...good, verified: true, corpus_ref: "ica-1872-s27" });
    expect(JSON.stringify(f)).not.toMatch(/verified|corpus_ref/);
  });
  it("strips keys it does not name instead of refusing them", () => {
    const f = reviewFindingSchema.parse({ ...good, advocate_action: "confirm", adjudicated_at: "2026-01-01", extra: 1 });
    expect(Object.keys(f).sort()).toEqual(
      ["citation", "clause_reference", "description", "finding_id", "layer", "remedy_suggested", "rule_applied", "severity", "status"].sort(),
    );
  });
  it("reads clause_text and override_note when they are sent, and does not need them", () => {
    expect(reviewFindingSchema.parse(good).clause_text).toBeUndefined();
    const f = reviewFindingSchema.parse({ ...good, clause_text: "span", override_note: null });
    expect(f.clause_text).toBe("span");
    expect(f.override_note).toBeNull();
  });
});

describe("the layer in R1", () => {
  it.each([
    ["INTAKE", 0],
    ["COMPLETENESS", 1],
    ["STATUTORY", 2],
    ["CONSISTENCY", 3],
    ["RISK_ASYMMETRY", 4],
    ["CITATION_GATE", 5],
    ["TRIAGE", 6],
  ])("normalises the name %s to the integer %i", (name, index) => {
    expect(layerSchema.parse(name)).toBe(index);
  });
  it("keeps an integer 0 to 6 as it is", () => {
    for (const n of [0, 1, 2, 3, 4, 5, 6]) expect(layerSchema.parse(n)).toBe(n);
  });
  it("refuses an unknown name, an out-of-range integer, a fraction and a numeric string", () => {
    for (const bad of ["NOPE", "", 7, -1, 2.5, "2", null]) expect(layerSchema.safeParse(bad).success, String(bad)).toBe(false);
  });
});

describe("the backend example finding", () => {
  it("parses as R1, with its name layer turned into the integer", () => {
    const parsed = reviewFindingSchema.safeParse(BACKEND_EXAMPLE_FINDING);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.layer).toBe(1);
      expect(parsed.data.status).toBe("pending");
      expect(parsed.data.citation).toContain("Code of Civil Procedure, 1908, s. 20");
    }
  });
});

describe("C1 conversation contract", () => {
  const cite = { clause_reference: "Clause 4", quote: "Payment is due in 45 days" };
  it("an answered reply needs text and a citation", () => {
    expect(chatReplySchema.safeParse({ status: "answered", answer: "45 days.", citations: [cite] }).success).toBe(true);
    expect(chatReplySchema.safeParse({ status: "answered", answer: "45 days." }).success).toBe(false);
  });
  it.each(["refused", "escalated"] as const)("a %s reply never carries a partial answer", (status) => {
    expect(chatReplySchema.safeParse({ status, reason: "Needs legal judgment" }).success).toBe(true);
    expect(chatReplySchema.safeParse({ status, reason: "x", answer: "partial" }).success).toBe(false);
    expect(chatReplySchema.safeParse({ status }).success).toBe(false);
  });
  it("trims before judging: spaces are no answer, no reason and no quote", () => {
    expect(chatReplySchema.safeParse({ status: "answered", answer: "   ", citations: [cite] }).success).toBe(false);
    expect(chatReplySchema.safeParse({ status: "answered", answer: "45 days.", citations: [{ clause_reference: "Clause 4", quote: "  " }] }).success).toBe(false);
    expect(chatReplySchema.safeParse({ status: "answered", answer: "45 days.", citations: [{ clause_reference: " ", quote: "x" }] }).success).toBe(false);
    for (const status of ["refused", "escalated"] as const) {
      expect(chatReplySchema.safeParse({ status, reason: "   " }).success).toBe(false);
      expect(chatReplySchema.safeParse({ status, reason: "x", answer: "  " }).success).toBe(true);
    }
    const ok = chatReplySchema.parse({ status: "answered", answer: "  45 days.  ", citations: [{ clause_reference: " Clause 4 ", quote: " Payment " }] });
    expect(ok.answer).toBe("45 days.");
    expect(ok.citations[0]).toEqual({ clause_reference: "Clause 4", quote: "Payment" });
  });
  it("defaults the language to English and rejects an empty question", () => {
    expect(chatRequestSchema.parse({ document_id: id, question: "What is clause 4?" }).language).toBe("en");
    expect(chatRequestSchema.safeParse({ document_id: id, question: "" }).success).toBe(false);
  });
});
