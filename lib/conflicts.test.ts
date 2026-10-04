import { describe, expect, it } from "vitest";
import { declaredConflictWith } from "./conflicts";

const parties = ["Bharosa Fintech Pvt Ltd", "Individual · Meera Nair"];

describe("a declared conflict against the parties to a document", () => {
  it("matches a name by its whole words, whatever the suffix", () => {
    expect(declaredConflictWith(parties, ["Bharosa Fintech"])).toEqual({
      declared: "Bharosa Fintech",
      party: "Bharosa Fintech Pvt Ltd",
    });
    expect(declaredConflictWith(parties, ["bharosa fintech private limited"])?.party).toBe(
      "Bharosa Fintech Pvt Ltd",
    );
  });

  it("matches an individual without the label in front of their name", () => {
    expect(declaredConflictWith(parties, ["Meera Nair"])?.party).toBe("Individual · Meera Nair");
  });

  it("matches one word of a company's name, because that is what an advocate would type", () => {
    expect(declaredConflictWith(parties, ["Bharosa"])?.party).toBe("Bharosa Fintech Pvt Ltd");
  });

  it("never matches part of a word", () => {
    expect(declaredConflictWith(parties, ["Bhar"])).toBeNull();
    expect(declaredConflictWith(parties, ["Mee"])).toBeNull();
  });

  it("does not match a name that is only company suffixes or empty", () => {
    expect(declaredConflictWith(parties, ["Pvt Ltd"])).toBeNull();
    expect(declaredConflictWith(parties, ["Individual"])).toBeNull();
    expect(declaredConflictWith(parties, ["", "   "])).toBeNull();
  });

  it("needs every word of the declared name to be in the party's name", () => {
    expect(declaredConflictWith(parties, ["Bharosa Logistics"])).toBeNull();
  });

  it("is nothing when nothing is declared", () => {
    expect(declaredConflictWith(parties, [])).toBeNull();
  });
});
