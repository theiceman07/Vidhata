import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoicesFor } from "@/lib/billing";
import { CONSULTATION } from "@/lib/config/pricing";
import {
  acceptConsultation,
  answerConsultation,
  declineConsultation,
  getAdvocateConsultation,
  listAdvocateConsultations,
  listConsultations,
  listOrgConsultations,
  payConsultation,
  requestConsultation,
} from "./consultations";

// The mock layer's failure switch (?fail=1 in a browser), set by a test.
const failure = vi.hoisted(() => ({ on: false }));
vi.mock("./delay", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delay")>();
  return { ...original, shouldSimulateFailure: () => failure.on };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  failure.on = false;
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  const caught = promise.then(
    () => "",
    (e: Error) => e.message,
  );
  await vi.runAllTimersAsync();
  return caught;
}

// Settled by Rhea Kapoor. The vendor agreement is not signed off.
const settled = "doc-nda-settled";
const unsigned = "doc-vendor-revision";

describe("requesting a consultation", () => {
  it("is with the advocate who settled the document, read from the document", async () => {
    const request = await settle(requestConsultation(settled, "Can the term be extended?"));
    expect(request).toMatchObject({
      documentId: settled,
      advocateName: "Rhea Kapoor",
      question: "Can the term be extended?",
      status: "requested",
    });
    // There is no way to name another advocate: the function takes none.
    expect(requestConsultation.length).toBe(2);
  });

  it("is refused on a document that has not been signed off", async () => {
    expect(await refusal(requestConsultation(unsigned, "A question"))).toMatch(
      /opens once the document is signed off/,
    );
    expect(await settle(listConsultations(unsigned))).toEqual([]);
  });

  it("is refused for a document that does not exist", async () => {
    expect(await refusal(requestConsultation("doc-nope", "A question"))).toBe("Document not found.");
  });

  it("needs a question, and a sane length", async () => {
    expect(await refusal(requestConsultation(settled, "   "))).toMatch(/what you would like to ask/);
    expect(await refusal(requestConsultation(settled, "x".repeat(1501)))).toMatch(/under 1500/);
  });

  it("is made once, however many times the button is pressed", async () => {
    const question = "Does this restrict me after the term ends?";
    const first = requestConsultation(settled, question);
    const second = requestConsultation(settled, `  ${question}  `);
    await vi.runAllTimersAsync();
    const [a, b] = await Promise.all([first, second]);
    expect(a.id).toBe(b.id);
    const listed = await settle(listConsultations(settled));
    expect(listed.filter((c) => c.question === question)).toHaveLength(1);
  });

  it("creates nothing when it fails, and can be tried again", async () => {
    const before = (await settle(listConsultations(settled))).length;
    failure.on = true;
    expect(await refusal(requestConsultation(settled, "A new question"))).toMatch(
      /Nothing was created/,
    );
    failure.on = false;
    expect((await settle(listConsultations(settled))).length).toBe(before);
    await settle(requestConsultation(settled, "A new question"));
    expect((await settle(listConsultations(settled))).length).toBe(before + 1);
  });

  it("is stored as requested, with no fee, no payment and no answer", async () => {
    const [latest] = await settle(listConsultations(settled));
    expect(latest).toMatchObject({
      status: "requested",
      fee: null,
      paidAt: null,
      acceptedAt: null,
      declinedAt: null,
      answer: null,
    });
  });
});

// Settled by Ananya Rao, the advocate the preview signs in as. The NDA above
// was settled by Rhea Kapoor, so between them there is a request that is
// yours and one that is not.
const mine = "doc-nda-settled-2";
const me = "adv-current";
const rhea = "adv-1";

async function ask(documentId: string, question: string) {
  return settle(requestConsultation(documentId, question));
}

describe("the advocate's inbox", () => {
  it("holds only requests on documents they settled", async () => {
    const theirs = await ask(settled, "A question on Rhea's document.");
    const yours = await ask(mine, "A question on Ananya's document.");
    expect(yours.advocateId).toBe(me);

    const inbox = await settle(listAdvocateConsultations(me));
    expect(inbox.map((c) => c.id)).toContain(yours.id);
    expect(inbox.map((c) => c.id)).not.toContain(theirs.id);
    expect(inbox.every((c) => c.advocateId === me)).toBe(true);

    const rheas = await settle(listAdvocateConsultations(rhea));
    expect(rheas.map((c) => c.id)).toContain(theirs.id);
    expect(rheas.map((c) => c.id)).not.toContain(yours.id);
  });

  it("lists a request without its question, its answer or its fee", async () => {
    await ask(mine, "A sensitive question for the list test.");
    const inbox = await settle(listAdvocateConsultations(me));
    expect(inbox.length).toBeGreaterThan(0);
    for (const row of inbox) {
      expect(row).not.toHaveProperty("question");
      expect(row).not.toHaveProperty("answer");
      expect(row).not.toHaveProperty("fee");
      expect(row).not.toHaveProperty("paidAt");
    }
    expect(JSON.stringify(inbox)).not.toMatch(/sensitive question/);
  });

  it("shows the question only inside the request", async () => {
    const made = await ask(mine, "Read me inside the request only.");
    const opened = await settle(getAdvocateConsultation(me, made.id));
    expect(opened?.question).toBe("Read me inside the request only.");
  });

  it("shows an advocate whether a request is paid and nothing of how", async () => {
    const made = await ask(mine, "What does the advocate see of this one?");
    await settle(acceptConsultation(me, made.id));
    await settle(payConsultation(made.id));
    const opened = (await settle(getAdvocateConsultation(me, made.id)))!;
    expect(opened.paid).toBe(true);
    expect(opened).not.toHaveProperty("fee");
    expect(opened).not.toHaveProperty("paidAt");
    expect(JSON.stringify(opened)).not.toMatch(/card|upi|bank|payment/i);
  });
});

describe("another advocate's request", () => {
  it("is not found by a direct link, exactly as a request that does not exist is", async () => {
    const made = await ask(settled, "Rhea's question, not Ananya's.");
    const other = await settle(getAdvocateConsultation(me, made.id));
    const missing = await settle(getAdvocateConsultation(me, "consultation-9999"));
    expect(other).toBeNull();
    expect(missing).toBeNull();
    expect(other).toEqual(missing);
  });

  it("cannot be accepted, declined or answered, and says what a missing one says", async () => {
    const made = await ask(settled, "Another advocate must not touch this.");
    const missing = await refusal(acceptConsultation(me, "consultation-9999"));
    expect(await refusal(acceptConsultation(me, made.id))).toBe(missing);
    expect(await refusal(declineConsultation(me, made.id))).toBe(missing);
    expect(await refusal(answerConsultation(me, made.id, "An answer."))).toBe(missing);

    // And it is untouched: still requested, still free.
    const [stillThere] = (await settle(listConsultations(settled))).filter((c) => c.id === made.id);
    expect(stillThere).toMatchObject({ status: "requested", fee: null });
  });
});

describe("accepting", () => {
  it("sets the flat fee for the client to pay, and nothing is paid yet", async () => {
    const made = await ask(mine, "Accept sets the fee.");
    const accepted = await settle(acceptConsultation(me, made.id));
    expect(accepted.status).toBe("accepted");
    expect(accepted.paid).toBe(false);

    const [asClient] = (await settle(listConsultations(mine))).filter((c) => c.id === made.id);
    expect(asClient).toMatchObject({ status: "accepted", fee: CONSULTATION.amount, paidAt: null });
  });

  it("is one state change however many times it is pressed", async () => {
    const made = await ask(mine, "Pressed twice in one instant.");
    const first = acceptConsultation(me, made.id);
    const second = acceptConsultation(me, made.id);
    await vi.runAllTimersAsync();
    await Promise.all([first, second]);
    const before = (await settle(listConsultations(mine))).find((c) => c.id === made.id)!;
    await settle(acceptConsultation(me, made.id));
    const after = (await settle(listConsultations(mine))).find((c) => c.id === made.id)!;
    expect(before.status).toBe("accepted");
    expect(after.acceptedAt).toBe(before.acceptedAt);
    expect(after.fee).toBe(before.fee);
  });
});

describe("declining", () => {
  it("is free and never chargeable", async () => {
    const made = await ask(mine, "To be declined.");
    const declined = await settle(declineConsultation(me, made.id));
    expect(declined).toMatchObject({ status: "declined", paid: false });

    // Nothing to pay, whatever is asked.
    expect(await refusal(payConsultation(made.id))).toMatch(/not chargeable/);
    const [asClient] = (await settle(listConsultations(mine))).filter((c) => c.id === made.id);
    expect(asClient).toMatchObject({ status: "declined", fee: null, paidAt: null });

    // And it can never be accepted afterwards.
    expect(await refusal(acceptConsultation(me, made.id))).toMatch(/declined/);
    const orgs = await settle(listOrgConsultations(asClient.orgId));
    expect(invoicesFor([], orgs.filter((c) => c.id === made.id))).toEqual([]);
  });

  it("cannot be done to a request that was accepted", async () => {
    const made = await ask(mine, "Accepted, then a change of mind.");
    await settle(acceptConsultation(me, made.id));
    expect(await refusal(declineConsultation(me, made.id))).toMatch(/cannot be declined/);
  });

  it("is one state change however many times it is pressed", async () => {
    const made = await ask(mine, "Declined twice.");
    const first = declineConsultation(me, made.id);
    const second = declineConsultation(me, made.id);
    await vi.runAllTimersAsync();
    const [a, b] = await Promise.all([first, second]);
    expect(a.declinedAt).toBe(b.declinedAt);
  });
});

describe("paying", () => {
  it("has nothing to pay before the advocate accepts", async () => {
    const made = await ask(mine, "Not accepted yet.");
    expect(await refusal(payConsultation(made.id))).toMatch(/has not accepted/);
  });

  it("moves money only here, once, however many times it is pressed", async () => {
    const made = await ask(mine, "Pay twice.");
    await settle(acceptConsultation(me, made.id));
    const first = payConsultation(made.id);
    const second = payConsultation(made.id);
    await vi.runAllTimersAsync();
    const [a, b] = await Promise.all([first, second]);
    expect(a.paidAt).not.toBeNull();
    expect(a.paidAt).toBe(b.paidAt);

    // One payment, one invoice, at the flat fee.
    const orgs = await settle(listOrgConsultations(a.orgId));
    const invoices = invoicesFor([], orgs.filter((c) => c.id === made.id));
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({ kind: "consultation_fee", amount: CONSULTATION.amount });

    // Paying again later changes nothing.
    const again = await settle(payConsultation(made.id));
    expect(again.paidAt).toBe(a.paidAt);
  });

  it("leaves the request accepted and unpaid when it fails, and can be tried again", async () => {
    const made = await ask(mine, "Pay fails first.");
    await settle(acceptConsultation(me, made.id));

    failure.on = true;
    expect(await refusal(payConsultation(made.id))).toMatch(/Nothing was charged/);
    failure.on = false;

    const [afterFailure] = (await settle(listConsultations(mine))).filter((c) => c.id === made.id);
    expect(afterFailure).toMatchObject({ status: "accepted", paidAt: null });
    const unpaid = await settle(getAdvocateConsultation(me, made.id));
    expect(unpaid).toMatchObject({ status: "accepted", paid: false });

    const paid = await settle(payConsultation(made.id));
    expect(paid.paidAt).not.toBeNull();
  });
});

describe("answering", () => {
  it("waits for the fee, and for the request to be accepted", async () => {
    const made = await ask(mine, "Answer in order.");
    expect(await refusal(answerConsultation(me, made.id, "Too soon."))).toMatch(/Accept the request/);
    await settle(acceptConsultation(me, made.id));
    expect(await refusal(answerConsultation(me, made.id, "Still too soon."))).toMatch(
      /fee has not been paid/,
    );
  });

  it("reaches the client only after payment, and then as it was written", async () => {
    const made = await ask(mine, "What is the notice period?");
    await settle(acceptConsultation(me, made.id));
    await settle(payConsultation(made.id));
    await settle(answerConsultation(me, made.id, "  Thirty days, as clause 4.1 states.  "));

    const [asClient] = (await settle(listConsultations(mine))).filter((c) => c.id === made.id);
    expect(asClient).toMatchObject({
      status: "answered",
      answer: "Thirty days, as clause 4.1 states.",
    });
  });

  it("needs words, and a sane length", async () => {
    const made = await ask(mine, "Answer with nothing.");
    await settle(acceptConsultation(me, made.id));
    await settle(payConsultation(made.id));
    expect(await refusal(answerConsultation(me, made.id, "   "))).toMatch(/Write your answer/);
    expect(await refusal(answerConsultation(me, made.id, "x".repeat(4001)))).toMatch(/under 4000/);
  });

  it("is sent once, and sending again changes nothing", async () => {
    const made = await ask(mine, "Answered twice.");
    await settle(acceptConsultation(me, made.id));
    await settle(payConsultation(made.id));
    const first = answerConsultation(me, made.id, "The first answer.");
    const second = answerConsultation(me, made.id, "A different answer.");
    await vi.runAllTimersAsync();
    await Promise.all([first, second]);
    const [asClient] = (await settle(listConsultations(mine))).filter((c) => c.id === made.id);
    // The delays are random, so either press may land first. One answer is
    // stored, and a press that comes later does not replace it.
    expect(["The first answer.", "A different answer."]).toContain(asClient.answer);
    await settle(answerConsultation(me, made.id, "A third, too late."));
    const [later] = (await settle(listConsultations(mine))).filter((c) => c.id === made.id);
    expect(later.answer).toBe(asClient.answer);
    expect(later.answeredAt).toBe(asClient.answeredAt);
  });
});

// The question is the client's own words and may hold sensitive facts. It goes
// to the client and the advocate, and nowhere that others could read: not the
// trail, not a notification, not billing. Files that build those are held to
// it, and any not built yet are covered the moment they exist. The client's
// own export is the one deliberate exception, because it is their own data,
// and lib/privacy.test.ts holds that choice.
describe("where the question may not go", () => {
  const root = path.resolve(__dirname, "..", "..");
  const files = [
    "lib/audit.ts",
    "lib/notifications.ts",
    "lib/api/notifications.ts",
    "lib/billing.ts",
    "lib/api/billing.ts",
  ]
    .map((f) => path.join(root, f))
    .filter((f) => existsSync(f));

  it("lists the files it guards", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the question out of any page title or tooltip", () => {
    // Shown in the client's own list and nowhere that outlives the screen: a
    // title appears in tabs and history, a tooltip or label on hover and to
    // assistive technology in other places.
    const pages = [
      path.join(root, "app", "(client)", "documents", "[id]", "consultation", "page.tsx"),
      path.join(root, "app", "(lawyer)", "consultations", "page.tsx"),
      path.join(root, "app", "(lawyer)", "consultations", "[id]", "page.tsx"),
    ];
    for (const page of pages) {
      const source = readFileSync(page, "utf8");
      expect(source, page).not.toMatch(
        /\b(title|aria-label|aria-description|alt)=\{[^}]*(question|answer)/i,
      );
      expect(source, page).not.toMatch(/document\.title|<title|export const metadata|generateMetadata/);
    }
  });

  it("keeps the question out of the advocate's list altogether", () => {
    const list = readFileSync(
      path.join(root, "app", "(lawyer)", "consultations", "page.tsx"),
      "utf8",
    );
    expect(list).not.toMatch(/\.question\b|\.answer\b/);
  });

  it("keeps the question out of the trail, notifications, exports and billing", () => {
    const offenders = files.filter((f) =>
      /api\/consultations|\.question\b|\.answer\b|\bquestion:|\banswer:/i.test(
        readFileSync(f, "utf8"),
      ),
    );
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
