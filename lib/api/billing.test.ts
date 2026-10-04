import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBillingProfile,
  getInvoice,
  listInvoices,
  saveBillingProfile,
} from "./billing";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

const org = "org-anaya-textiles";

describe("an organisation's invoices", () => {
  it("are its own: another organisation's payment is not among them", async () => {
    const invoices = await settle(listInvoices(org));
    expect(invoices.map((i) => i.description)).not.toContain(
      "Master Services Agreement · Sundargarh Logistics",
    );
    expect(invoices.length).toBeGreaterThan(0);
  });

  it("can be opened by number, and a missing number is nothing", async () => {
    const [first] = await settle(listInvoices(org));
    expect(await settle(getInvoice(org, first.number))).toEqual(first);
    expect(await settle(getInvoice(org, "VID-1999-0001"))).toBeNull();
  });
});

describe("the billing details", () => {
  it("start as the organisation's name, with no GSTIN", async () => {
    expect(await settle(getBillingProfile(org))).toEqual({
      name: "Anaya Textiles Pvt Ltd",
      gstin: null,
    });
  });

  it("keep a GSTIN as typed, trimmed, and check it against nothing", async () => {
    const saved = await settle(
      saveBillingProfile(org, { name: " Anaya Textiles Pvt Ltd ", gstin: "  not a real number  " }),
    );
    expect(saved).toEqual({ name: "Anaya Textiles Pvt Ltd", gstin: "not a real number" });
    expect(await settle(getBillingProfile(org))).toEqual(saved);
  });

  it("treat a blank GSTIN as none", async () => {
    const saved = await settle(saveBillingProfile(org, { name: "Anaya", gstin: "   " }));
    expect(saved.gstin).toBeNull();
  });

  it("need a name to make invoices out to", async () => {
    const attempt = saveBillingProfile(org, { name: "  ", gstin: "" });
    const refused = expect(attempt).rejects.toThrow(/name invoices are made out to/);
    await vi.runAllTimersAsync();
    await refused;
  });
});
