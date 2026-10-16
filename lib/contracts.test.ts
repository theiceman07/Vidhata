import { describe, expect, it } from "vitest";
import { chatReplySchema, chatRequestSchema, citationSchema, reviewFindingSchema } from "./contracts";

const id = "11111111-1111-4111-8111-111111111111";

describe("R1 finding contract", () => {
  it("accepts a finding and fills the defaults", () => {
    const f = reviewFindingSchema.parse({ finding_id: id, layer: 2, severity: "high", description: "Void non-compete" });
    expect(f.status).toBe("pending");
    expect(f.citations).toEqual([]);
    expect(f.rule_applied).toBeNull();
    expect(f.clause_text).toBeNull();
    expect(f.override_note).toBeNull();
  });
  it("names the rule rule_applied, as the database does", () => {
    const f = reviewFindingSchema.parse({ finding_id: id, layer: 2, severity: "low", description: "x", rule_applied: "ICA-S27-NONCOMPETE-V2" });
    expect(f.rule_applied).toBe("ICA-S27-NONCOMPETE-V2");
    expect("rule_id" in f).toBe(false);
  });
  it.each(["low", "medium", "high"])("accepts severity %s", (severity) => {
    expect(reviewFindingSchema.safeParse({ finding_id: id, layer: 1, severity, description: "x" }).success).toBe(true);
  });
  it("has no critical severity: the screens know three", () => {
    expect(reviewFindingSchema.safeParse({ finding_id: id, layer: 2, severity: "critical", description: "x" }).success).toBe(false);
  });
  it.each(["pending", "confirmed", "overridden", "added"])("accepts status %s", (status) => {
    expect(reviewFindingSchema.safeParse({ finding_id: id, layer: 1, severity: "low", description: "x", status }).success).toBe(true);
  });
  it("carries a list of citations, each held to verified-iff-corpus_ref", () => {
    const base = { finding_id: id, layer: 2, severity: "high", description: "x" };
    const two = [
      { text: "ICA s.27", verified: true, corpus_ref: "ica-s27" },
      { text: "Made-up s.9", verified: false },
    ];
    expect(reviewFindingSchema.parse({ ...base, citations: two }).citations).toHaveLength(2);
    expect(reviewFindingSchema.safeParse({ ...base, citations: [{ text: "ICA s.27", verified: true }] }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({ ...base, citations: [two[0], { text: "x", verified: false, corpus_ref: "r" }] }).success).toBe(false);
  });
  it("rejects an out-of-range layer and an unknown severity", () => {
    expect(reviewFindingSchema.safeParse({ finding_id: id, layer: 7, severity: "low", description: "x" }).success).toBe(false);
    expect(reviewFindingSchema.safeParse({ finding_id: id, layer: 2, severity: "urgent", description: "x" }).success).toBe(false);
  });
  it("a verified citation needs a corpus_ref and a blocked one must not have one", () => {
    expect(citationSchema.safeParse({ text: "ICA s.27", verified: true, corpus_ref: "ica-s27" }).success).toBe(true);
    expect(citationSchema.safeParse({ text: "Made-up s.9", verified: false }).success).toBe(true);
    expect(citationSchema.safeParse({ text: "ICA s.27", verified: true }).success).toBe(false);
    expect(citationSchema.safeParse({ text: "x", verified: false, corpus_ref: "ica-s27" }).success).toBe(false);
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
