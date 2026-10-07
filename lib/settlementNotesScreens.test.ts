import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettlementNoteView } from "@/components/document/settlement-note-view";
import { SettlementNotesPanel } from "@/components/domain/settlement-notes-panel";
import type { SettlementNote } from "./types";

// The tests compile JSX the classic way, which looks for React in scope (see clientScreens.test.ts).
(globalThis as { React?: typeof React }).React = React;

const clauses = [
  { number: "1.1", heading: "Definitions" },
  { number: "2.1", heading: "Term" },
  { number: "3.1", heading: "Payment" },
];

const note = (over: Partial<SettlementNote>): SettlementNote => ({
  id: "n",
  clauseNumber: "1.1",
  text: "A note.",
  shareWithClient: false,
  createdAt: "2026-10-06T09:00:00.000Z",
  updatedAt: "2026-10-06T09:00:00.000Z",
  releasedAt: null,
  ...over,
});

const DRAFT = "DRAFT-TEXT-not-for-the-client";
const SHARED = "SHARED-TEXT-for-the-client";

const render = (notes: SettlementNote[], over: Partial<{ clauses: typeof clauses }> = {}) =>
  renderToStaticMarkup(
    createElement(SettlementNotesPanel, {
      documentId: "doc",
      advocateId: "adv",
      clauses: over.clauses ?? clauses,
      notes,
      onNotes: () => {},
    }),
  );

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("the notes to the client, on the sign-off page", () => {
  const html = render([
    note({ id: "a", clauseNumber: "1.1", text: DRAFT }),
    note({ id: "b", clauseNumber: "2.1", text: SHARED, shareWithClient: true }),
  ]);

  it("says what a note is, and that it is not a working note", () => {
    expect(html).toContain("Notes to the client");
    expect(html).toContain("shared with the client at sign-off if you mark it, and only then");
    expect(html).toContain("working notes in the margin, which are never shared");
  });

  it("shows a draft as a draft, a marked note as marked, and starts a new one unmarked", () => {
    expect(html).toContain("Draft: not shared");
    expect(html).toContain("Marked: shared at sign-off");
    // One box ticked (the marked note) and one not (the draft).
    expect(count(html, 'role="checkbox"')).toBe(2);
    expect(count(html, 'aria-checked="true"')).toBe(1);
    expect(count(html, 'aria-checked="false"')).toBe(1);
  });

  it("lists, under what will be shared, the marked note as written and no draft", () => {
    const shared = html.slice(html.indexOf("These will be shared with the client"));
    expect(shared).toContain(SHARED);
    expect(shared).not.toContain(DRAFT);
    // The draft is on the screen once, in the list the advocate works from.
    expect(count(html, DRAFT)).toBe(1);
    expect(count(html, SHARED)).toBe(2);
  });

  it("says nothing is shared when nothing is marked, and when there are no notes at all", () => {
    const none = render([note({ id: "a", text: DRAFT })]);
    expect(none).toContain("No notes are marked. Nothing is shared with the client at sign-off except the settled document.");
    expect(none.slice(none.indexOf("These will be shared with the client"))).not.toContain(DRAFT);

    const empty = render([]);
    expect(empty).toContain("No notes to the client yet.");
    expect(empty).toContain("No notes are marked.");
  });

  it("offers a new note only for a clause that has none", () => {
    expect(html).toContain("Add a note to the client");
    const full = render(clauses.map((c, i) => note({ id: `n${i}`, clauseNumber: c.number })));
    expect(full).not.toContain("Add a note to the client");
  });
});

describe("a note to the client, read", () => {
  it("is the advocate's words as written, under the label it is given, with the date only once released", () => {
    const before = renderToStaticMarkup(
      createElement(SettlementNoteView, { label: "Note to client", clauseNumber: "2.1", clauseHeading: "Term", text: SHARED }),
    );
    expect(before).toContain("Note to client");
    expect(before).toContain("Clause 2.1 · Term");
    expect(before).toContain(SHARED);
    expect(before).not.toMatch(/\d{4}/);

    const after = renderToStaticMarkup(
      createElement(SettlementNoteView, {
        label: "Your advocate's note",
        clauseNumber: "2.1",
        text: SHARED,
        releasedAt: "2026-10-06T09:00:00.000Z",
      }),
    );
    expect(after).toContain("Your advocate&#x27;s note");
    expect(after).toContain("6 Oct 2026");
  });
});

describe("the files that make these screens", () => {
  const root = path.resolve(__dirname, "..");
  const files = [
    "components/document/settlement-note-view.tsx",
    "components/domain/settlement-notes-panel.tsx",
    "app/(lawyer)/review/[id]/sign-off/page.tsx",
  ];
  const read = (f: string) => readFileSync(path.join(root, f), "utf8");

  it("use the product's words and no em dash", () => {
    for (const f of files) {
      const source = read(f);
      expect(source, f).not.toContain("—");
      // Strings a person reads, not comments.
      const strings = [...source.matchAll(/>\s*([^<>{}\n]{6,})\s*</g)].map((m) => m[1]).join("\n");
      expect(strings, f).not.toMatch(/\blawyer\b|\bfinalis|\bapproval\b|\bnext steps\b/i);
    }
  });

  it("cannot release a note: the panel reaches no sign-off and sets no release", () => {
    const panel = read("components/domain/settlement-notes-panel.tsx");
    expect(panel).not.toMatch(/signOffDocument|releaseMarked|releasedAt\s*[:=]/);
    expect(panel).toMatch(/lib\/api\/settlement-notes/);
  });

  it("is shared by both portals' screens without holding a record", () => {
    const view = read("components/document/settlement-note-view.tsx");
    expect(view).not.toMatch(/lib\/api|ContractDocument|\bFinding\b|lib\/mock/);
  });
});
