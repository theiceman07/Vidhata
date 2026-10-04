import { describe, expect, it } from "vitest";
import {
  CONTRACT_CATALOGUE,
  CONTRACT_GROUPS,
  CONTRACT_TYPES,
} from "./intake-options.mock";

describe("the contract catalogue", () => {
  it("holds nineteen types in five groups, in the published order", () => {
    expect(CONTRACT_CATALOGUE).toHaveLength(19);
    expect(
      CONTRACT_GROUPS.map((g) => CONTRACT_CATALOGUE.filter((e) => e.group === g.id).length),
    ).toEqual([4, 4, 4, 4, 3]);
  });

  it("names every type as the source list does, in order", () => {
    expect(CONTRACT_CATALOGUE.map((e) => e.label)).toEqual([
      "Vendor / Supplier Agreement",
      "Service Level Agreement (SLA)",
      "Master Services Agreement (MSA)",
      "Distributor / Dealership Agreement",
      "Non-Disclosure Agreement (NDA)",
      "Co-Founder / Founders' Agreement",
      "Partnership Deed",
      "Joint Venture Agreement (JVA)",
      "Employment Contract / Appointment Letter",
      "Independent Consultant / Freelancer Agreement",
      "Non-Compete & Non-Solicitation Agreement",
      "Employee Stock Option Plan (ESOP) Agreement",
      "Shareholders' Agreement (SHA)",
      "Term Sheet / Investment Agreement",
      "Loan / Debt Agreement",
      "Inter-creditor / Hypothecation Agreement",
      "Commercial Lease / Rental Agreement",
      "Leave and License Agreement",
      "Equipment Lease Agreement",
    ]);
  });

  it("gives every type its own id", () => {
    const ids = CONTRACT_CATALOGUE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the four draftable types draftable, and the rest coming soon", () => {
    expect(CONTRACT_CATALOGUE.filter((e) => e.available).map((e) => e.id)).toEqual([
      "vendor",
      "msa",
      "nda",
      "employment",
    ]);
  });

  it("derives the draftable list from the flag, under the names a draft carries", () => {
    expect(CONTRACT_TYPES).toEqual([
      { value: "vendor", label: "Vendor agreement" },
      { value: "msa", label: "Master Services Agreement" },
      { value: "nda", label: "NDA" },
      { value: "employment", label: "Employment agreement" },
    ]);
  });

  it("maps no two available types to the same kind of draft", () => {
    const drafts = CONTRACT_TYPES.map((t) => t.value);
    expect(new Set(drafts).size).toBe(drafts.length);
  });
});
