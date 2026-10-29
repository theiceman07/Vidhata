import { describe, expect, it } from "vitest";
import { wordDiff } from "./wordDiff";

const marked = (parts: { text: string; kind: string }[], kind: string) =>
  parts.filter((p) => p.kind === kind && p.text.trim() !== "").map((p) => p.text);

describe("wordDiff", () => {
  it("marks only the words that changed, and keeps each side whole", () => {
    const before = "The term is thirty six (36) months from signature.";
    const after = "The term is twenty four (24) months from signature.";
    const d = wordDiff(before, after);
    expect(marked(d.before, "removed")).toEqual(["thirty", "six", "(36)"]);
    expect(marked(d.after, "added")).toEqual(["twenty", "four", "(24)"]);
    expect(d.before.map((p) => p.text).join("")).toBe(before);
    expect(d.after.map((p) => p.text).join("")).toBe(after);
  });

  it("marks nothing when the texts are the same", () => {
    const d = wordDiff("same words", "same words");
    expect(d.before.every((p) => p.kind === "same")).toBe(true);
    expect(d.after.every((p) => p.kind === "same")).toBe(true);
  });
});
