import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addSettlementNote, listSettlementNotes, updateSettlementNote } from "./settlement-notes";
import { getDocument, heldDocument, signOffDocument } from "./documents";
import { advocate, claimedDocument, refusal, settle, settleEverything } from "./testing";

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

/** A held document with every finding decided, so sign-off is only a press away, and two notes on it. */
async function readyToSignOff() {
  const claimed = await claimedDocument();
  const [a, b] = claimed.clauses;
  const marked = await settle(addSettlementNote(advocate.id, claimed.id, a.number, "To be shared."));
  await settle(updateSettlementNote(advocate.id, claimed.id, marked.id, { shareWithClient: true }));
  const draft = await settle(addSettlementNote(advocate.id, claimed.id, b.number, "A draft, not to be shared."));
  await settleEverything(claimed.id);
  return { id: claimed.id, marked, draft };
}

describe("signing off, and the notes to the client", () => {
  it("releases the marked notes with the sign-off, at its time, and never a draft", async () => {
    const { id, marked, draft } = await readyToSignOff();
    const signed = await settle(signOffDocument(id, advocate.id));
    expect(signed.status).toBe("settled");
    const byId = Object.fromEntries((signed.settlementNotes ?? []).map((n) => [n.id, n]));
    expect(byId[marked.id].releasedAt).toBe(signed.settledAt);
    expect(byId[draft.id].releasedAt).toBeNull();
    expect(byId[draft.id].shareWithClient).toBe(false);
  });

  it("signs off a document that has no notes, and invents none", async () => {
    const claimed = await claimedDocument();
    await settleEverything(claimed.id);
    const signed = await settle(signOffDocument(claimed.id, advocate.id));
    expect(signed.status).toBe("settled");
    expect(signed.settlementNotes ?? []).toEqual([]);
  });

  it("does not release a note marked and then un-marked before sign-off", async () => {
    const { id, marked } = await readyToSignOff();
    await settle(updateSettlementNote(advocate.id, id, marked.id, { shareWithClient: false }));
    const signed = await settle(signOffDocument(id, advocate.id));
    expect((signed.settlementNotes ?? []).every((n) => n.releasedAt === null)).toBe(true);
  });

  it("is done once: a second press changes nothing and releases nothing more", async () => {
    const { id } = await readyToSignOff();
    const first = await settle(signOffDocument(id, advocate.id));
    vi.advanceTimersByTime(60 * 60 * 1000);
    const again = await settle(signOffDocument(id, advocate.id));
    expect(again.settledAt).toBe(first.settledAt);
    expect(again.settlementNotes).toEqual(first.settlementNotes);
  });

  it("releases nothing when sign-off is refused because a finding is still open", async () => {
    const claimed = await claimedDocument();
    const note = await settle(addSettlementNote(advocate.id, claimed.id, claimed.clauses[0].number, "Marked."));
    await settle(updateSettlementNote(advocate.id, claimed.id, note.id, { shareWithClient: true }));
    expect(await refusal(signOffDocument(claimed.id, advocate.id))).toBe(
      "Every finding must be settled before sign-off.",
    );
    const [kept] = await settle(listSettlementNotes(advocate.id, claimed.id));
    expect(kept).toMatchObject({ shareWithClient: true, releasedAt: null });
    expect((await settle(getDocument(claimed.id)))!.status).toBe("under_review");
  });

  it("releases nothing when sign-off fails partway", async () => {
    const { id } = await readyToSignOff();
    failure.on = true;
    expect(await refusal(signOffDocument(id, advocate.id))).toBe("Could not complete sign-off.");
    failure.on = false;
    expect((await settle(listSettlementNotes(advocate.id, id))).every((n) => n.releasedAt === null)).toBe(true);
    expect((await settle(getDocument(id)))!.status).toBe("under_review");
    // And it can be tried again, and then releases once.
    const signed = await settle(signOffDocument(id, advocate.id));
    expect((signed.settlementNotes ?? []).filter((n) => n.releasedAt !== null)).toHaveLength(1);
  });

  it("stops, and names the note, when a marked note is on a clause the draft does not have", async () => {
    const { id } = await readyToSignOff();
    // No API removes a clause, so the record is put in the state a change of draft would leave it in.
    const live = heldDocument(id, advocate.id);
    live.settlementNotes = [
      ...(live.settlementNotes ?? []),
      {
        id: "settlement-note-stray",
        clauseNumber: "99.99",
        text: "About text that is gone.",
        shareWithClient: true,
        createdAt: "2026-10-06T09:00:00.000Z",
        updatedAt: "2026-10-06T09:00:00.000Z",
        releasedAt: null,
      },
    ];
    expect(await refusal(signOffDocument(id, advocate.id))).toBe(
      "A note to the client is on clause 99.99, which is not in this draft. Move or remove it before sign-off.",
    );
    // Nothing was released, not even the notes that were fine, and the document is not signed off.
    expect((live.settlementNotes ?? []).every((n) => n.releasedAt === null)).toBe(true);
    expect((await settle(getDocument(id)))!.status).toBe("under_review");
  });

  it("leaves the released notes unchangeable once the document is signed off", async () => {
    const { id, marked } = await readyToSignOff();
    await settle(signOffDocument(id, advocate.id));
    expect(await refusal(updateSettlementNote(advocate.id, id, marked.id, { text: "Changed after." }))).toBe(
      "This document is signed off. Its notes can no longer be changed.",
    );
  });
});

describe("what can set the time a note was released", () => {
  const root = path.resolve(__dirname, "..", "..");

  function sources(dir: string): string[] {
    return readdirSync(path.join(root, dir)).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(path.join(root, full)).isDirectory()) return sources(full);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full.split(path.sep).join("/")] : [];
    });
  }
  const all = [...sources("app"), ...sources("components"), ...sources("lib")];

  it("is one function, called from one place: signing off", () => {
    const callers = all.filter((f) => /\breleaseMarked\(/.test(readFileSync(path.join(root, f), "utf8")));
    expect(callers.sort()).toEqual(["lib/api/documents.ts", "lib/settlementNotes.ts"]);
    const documents = readFileSync(path.join(root, "lib/api/documents.ts"), "utf8");
    const at = documents.indexOf("releaseMarked(doc.settlementNotes");
    const inFunction = documents.lastIndexOf("export async function", at);
    expect(documents.slice(inFunction, inFunction + 60)).toContain("signOffDocument");
  });

  it("is written nowhere else as a value but null", () => {
    for (const f of all) {
      const source = readFileSync(path.join(root, f), "utf8");
      // A releasedAt that is assigned or set to anything but null: only the release itself does it.
      const sets = [...source.matchAll(/\breleasedAt\s*(?::|=)(?!\s*(?:null\b|=|string \| null))\s*([^,;\n}]+)/g)].map(
        (m) => m[0],
      );
      // The release itself, the type declarations, and the two places a released note is copied
      // for a client (the shaper and the export). None of them sets a stored note's time.
      const allowed: Record<string, string[]> = {
        "lib/settlementNotes.ts": ["releasedAt: at"],
        "lib/types.ts": ["releasedAt: string"],
        "lib/privacy.ts": ["releasedAt: n.releasedAt"],
        "lib/api/client/shape-settlement-notes.ts": ["releasedAt: n.releasedAt as string"],
        // A prop handing a released note's stored time to the read-only view.
        "app/(lawyer)/review/[id]/sign-off/page.tsx": ["releasedAt={n.releasedAt"],
      };
      expect(sets.filter((s) => !(allowed[f] ?? []).includes(s.trim())), f).toEqual([]);
    }
  });
});
