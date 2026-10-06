import { describe, expect, it } from "vitest";
import {
  MAX_SETTLEMENT_NOTE_LENGTH,
  checkNoteText,
  noteIsReleased,
  partitionForRelease,
  releaseMarked,
} from "./settlementNotes";
import type { SettlementNote } from "./types";

const note = (over: Partial<SettlementNote> = {}): SettlementNote => ({
  id: "n",
  clauseNumber: "1.1",
  text: "A note.",
  shareWithClient: false,
  createdAt: "2026-10-06T09:00:00.000Z",
  updatedAt: "2026-10-06T09:00:00.000Z",
  releasedAt: null,
  ...over,
});

const doc = { clauses: [{ number: "1.1" }, { number: "2.1" }] } as Parameters<typeof partitionForRelease>[0];

describe("the text of a settlement note", () => {
  it("is trimmed", () => {
    expect(checkNoteText("  Read this with clause 2.  ")).toEqual({ ok: true, text: "Read this with clause 2." });
  });

  it("is not a note when it is blank, whatever the blank is made of", () => {
    for (const blank of ["", "   ", "\n\t \n"]) {
      expect(checkNoteText(blank), JSON.stringify(blank)).toEqual({
        ok: false,
        reason: "Write the note to the client.",
      });
    }
  });

  it("is capped, and the cap itself is allowed", () => {
    expect(checkNoteText("x".repeat(MAX_SETTLEMENT_NOTE_LENGTH)).ok).toBe(true);
    expect(checkNoteText("x".repeat(MAX_SETTLEMENT_NOTE_LENGTH + 1))).toEqual({
      ok: false,
      reason: `Keep the note under ${MAX_SETTLEMENT_NOTE_LENGTH} characters.`,
    });
  });

  it("is measured after trimming, so padding does not count against it", () => {
    expect(checkNoteText(`  ${"x".repeat(MAX_SETTLEMENT_NOTE_LENGTH)}  `).ok).toBe(true);
  });
});

describe("what sign-off would release", () => {
  it("is the marked notes on clauses the draft has, and no draft", () => {
    const marked = note({ id: "marked", shareWithClient: true });
    const draft = note({ id: "draft", clauseNumber: "2.1", shareWithClient: false });
    const { release, orphaned } = partitionForRelease(doc, [marked, draft]);
    expect(release.map((n) => n.id)).toEqual(["marked"]);
    expect(orphaned).toEqual([]);
  });

  it("keeps a marked note on a clause that is not in the draft out of the release, and names it", () => {
    const stray = note({ id: "stray", clauseNumber: "9.9", shareWithClient: true });
    const { release, orphaned } = partitionForRelease(doc, [stray]);
    expect(release).toEqual([]);
    expect(orphaned.map((n) => n.id)).toEqual(["stray"]);
  });

  it("never offers a note that is already released", () => {
    const done = note({ shareWithClient: true, releasedAt: "2026-10-05T09:00:00.000Z" });
    expect(partitionForRelease(doc, [done])).toEqual({ release: [], orphaned: [] });
  });
});

describe("releasing at sign-off", () => {
  const at = "2026-10-07T10:00:00.000Z";

  it("sets the time on every marked note and on nothing else", () => {
    const out = releaseMarked(
      [note({ id: "a", shareWithClient: true }), note({ id: "b", clauseNumber: "2.1", shareWithClient: false })],
      at,
    );
    expect(out.map((n) => [n.id, n.releasedAt])).toEqual([
      ["a", at],
      ["b", null],
    ]);
  });

  it("does not move the time of a note already released, so signing off twice releases nothing more", () => {
    const first = releaseMarked([note({ shareWithClient: true })], at);
    const again = releaseMarked(first, "2026-10-08T10:00:00.000Z");
    expect(again[0].releasedAt).toBe(at);
  });

  it("does not change the notes it was given", () => {
    const given = [note({ shareWithClient: true })];
    releaseMarked(given, at);
    expect(given[0].releasedAt).toBeNull();
    expect(noteIsReleased(given[0])).toBe(false);
  });
});
