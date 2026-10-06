import { describe, expect, it } from "vitest";
import { classifyQuestion } from "./classify";
import { QUESTIONS, type QuestionGroup } from "./questions.fixtures";

/**
 * The explain-versus-advise gate, held to a labelled set of questions. The set is
 * what a real classifier has to pass too, so a case added here binds both.
 */

const group = (g: QuestionGroup) => QUESTIONS.filter((x) => x.group === g);

describe("the labelled questions", () => {
  it("cover every way a question goes wrong, with enough of each to mean something", () => {
    const minimum: Record<QuestionGroup, number> = {
      explain: 15,
      advise: 10,
      indirect: 10,
      mixed: 6,
      injection: 6,
      other_language: 5,
      unclear: 8,
      edge: 8,
    };
    for (const [name, least] of Object.entries(minimum)) {
      expect(group(name as QuestionGroup).length, name).toBeGreaterThanOrEqual(least);
    }
  });

  it("are each given the label they carry", () => {
    const wrong = QUESTIONS.filter((x) => classifyQuestion(x.text) !== x.expected).map(
      (x) => `${x.group}: "${x.text.slice(0, 60)}" is ${classifyQuestion(x.text)}, not ${x.expected}`,
    );
    expect(wrong).toEqual([]);
  });
});

describe("the gate", () => {
  it("lets a question through only when it is plainly asking what the document says", () => {
    for (const x of group("explain")) expect(classifyQuestion(x.text), x.text).toBe("explain");
  });

  it("treats any advice in a question as advice, so half a question is never answered", () => {
    for (const x of group("mixed")) expect(classifyQuestion(x.text), x.text).toBe("advise");
  });

  it("treats a request to set the rules aside as advice, however it is dressed", () => {
    for (const x of group("injection")) expect(classifyQuestion(x.text), x.text).toBe("advise");
  });

  it("does not answer words it does not read, and does not call them advice either", () => {
    for (const x of group("other_language")) expect(classifyQuestion(x.text), x.text).toBe("unclear");
  });

  it("is not changed by case, punctuation or a very long question", () => {
    expect(classifyQuestion("what does clause 4.1 say")).toBe(classifyQuestion("WHAT DOES CLAUSE 4.1 SAY!!!"));
    expect(classifyQuestion("should i sue them")).toBe(classifyQuestion("SHOULD I SUE THEM???"));
  });

  it("gives the same answer to the same question every time", () => {
    for (const x of QUESTIONS) expect(classifyQuestion(x.text)).toBe(classifyQuestion(x.text));
  });
});
