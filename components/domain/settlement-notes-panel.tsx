"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SettlementNoteView } from "@/components/document/settlement-note-view";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addSettlementNote,
  deleteSettlementNote,
  updateSettlementNote,
} from "@/lib/api/settlement-notes";
import { MAX_SETTLEMENT_NOTE_LENGTH } from "@/lib/settlementNotes";
import type { Clause, SettlementNote } from "@/lib/types";

/**
 * The advocate's notes to the client, on the sign-off page.
 *
 * Not the working notes in the margin: those are never shared, and nothing here
 * turns one into the other. A note is written as a draft. Sharing it at sign-off
 * is a second act, a checkbox that starts unticked, and the notes marked are
 * listed again, verbatim, under "These will be shared with the client", so what
 * the client will read is on the screen before the signature. Nothing on this
 * panel releases a note: only the sign-off does.
 */
export function SettlementNotesPanel({
  documentId,
  advocateId,
  clauses,
  notes,
  onNotes,
}: {
  documentId: string;
  advocateId: string;
  clauses: Pick<Clause, "number" | "heading">[];
  notes: SettlementNote[];
  onNotes: (next: SettlementNote[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [clause, setClause] = useState("");
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const headingOf = (number: string) => clauses.find((c) => c.number === number)?.heading ?? null;
  const order = (list: SettlementNote[]) =>
    [...list].sort(
      (a, b) =>
        clauses.findIndex((c) => c.number === a.clauseNumber) -
        clauses.findIndex((c) => c.number === b.clauseNumber),
    );
  const free = clauses.filter((c) => !notes.some((n) => n.clauseNumber === c.number));
  const marked = order(notes).filter((n) => n.shareWithClient);

  async function run<T>(work: () => Promise<T>, fallback: string): Promise<T | undefined> {
    setBusy(true);
    try {
      return await work();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : fallback);
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const note = await run(
      () => addSettlementNote(advocateId, documentId, clause, text),
      "Could not keep this note.",
    );
    if (!note) return;
    onNotes(order([...notes, note]));
    setClause("");
    setText("");
  }

  async function mark(note: SettlementNote, share: boolean) {
    const updated = await run(
      () => updateSettlementNote(advocateId, documentId, note.id, { shareWithClient: share }),
      "Could not save this note.",
    );
    if (updated) onNotes(notes.map((n) => (n.id === note.id ? updated : n)));
  }

  async function save(note: SettlementNote) {
    const updated = await run(
      () => updateSettlementNote(advocateId, documentId, note.id, { text: editText }),
      "Could not save this note.",
    );
    if (!updated) return;
    onNotes(notes.map((n) => (n.id === note.id ? updated : n)));
    setEditing(null);
  }

  async function remove(note: SettlementNote) {
    const done = await run(
      () => deleteSettlementNote(advocateId, documentId, note.id).then(() => true),
      "Could not remove this note.",
    );
    if (done) onNotes(notes.filter((n) => n.id !== note.id));
  }

  return (
    <section aria-labelledby="notes-to-client" className="mt-8">
      <h2 id="notes-to-client" className="text-label font-medium text-muted-fg">
        Notes to the client
      </h2>
      <p className="mt-1 max-w-measure text-meta text-muted-fg">
        A note here is shared with the client at sign-off if you mark it, and only then. It is not
        one of your working notes in the margin, which are never shared.
      </p>

      {notes.length === 0 ? (
        <p className="mt-4 rounded-card bg-parchment p-4 text-meta text-muted-fg">
          No notes to the client yet. Add one to explain a clause the client will read once the
          document is settled.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {order(notes).map((note) => (
            <li key={note.id} className="rounded-card bg-parchment p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-label font-medium text-ink">
                  Clause {note.clauseNumber}
                  {headingOf(note.clauseNumber) ? ` · ${headingOf(note.clauseNumber)}` : ""}
                </p>
                <p className={note.shareWithClient ? "text-label text-accent" : "text-label text-muted-fg"}>
                  {note.shareWithClient ? "Marked: shared at sign-off" : "Draft: not shared"}
                </p>
              </div>

              {editing === note.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    aria-label={`Note to the client on clause ${note.clauseNumber}`}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={MAX_SETTLEMENT_NOTE_LENGTH}
                    rows={4}
                    disabled={busy}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => save(note)} disabled={busy || !editText.trim()}>
                      Save note
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-line text-body text-ink">{note.text}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`share-${note.id}`}
                    checked={note.shareWithClient}
                    disabled={busy}
                    onCheckedChange={(value) => mark(note, value === true)}
                  />
                  <Label htmlFor={`share-${note.id}`} className="text-meta font-normal text-ink">
                    Share with client at sign-off
                  </Label>
                </div>
                {editing !== note.id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Edit the note on clause ${note.clauseNumber}`}
                      onClick={() => {
                        setEditing(note.id);
                        setEditText(note.text);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Remove the note on clause ${note.clauseNumber}`}
                      onClick={() => remove(note)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {free.length > 0 && (
        <div className="mt-4 rounded-card bg-parchment p-4">
          <p className="text-label font-medium text-ink">Add a note to the client</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
            <div>
              <Label htmlFor="note-clause" className="text-label text-muted-fg">
                Clause
              </Label>
              <Select value={clause} onValueChange={setClause} disabled={busy}>
                <SelectTrigger id="note-clause" className="mt-1">
                  <SelectValue placeholder="Choose a clause" />
                </SelectTrigger>
                <SelectContent>
                  {free.map((c) => (
                    <SelectItem key={c.number} value={c.number}>
                      {c.number} · {c.heading}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="note-text" className="text-label text-muted-fg">
                Note
              </Label>
              <Textarea
                id="note-text"
                className="mt-1"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_SETTLEMENT_NOTE_LENGTH}
                rows={4}
                disabled={busy}
                placeholder="Say, in your own words, what this clause means for the client."
              />
              <p className="mt-1 text-label text-muted-fg">
                {text.length} of {MAX_SETTLEMENT_NOTE_LENGTH} · Kept as a draft until you mark it to share.
              </p>
            </div>
          </div>
          <Button className="mt-3" size="sm" onClick={add} disabled={busy || !clause || !text.trim()}>
            {busy ? "Keeping" : "Add note"}
          </Button>
        </div>
      )}

      <h3 className="mt-8 text-label font-medium text-muted-fg">These will be shared with the client</h3>
      {marked.length === 0 ? (
        <p className="mt-2 text-meta text-muted-fg">
          No notes are marked. Nothing is shared with the client at sign-off except the settled
          document.
        </p>
      ) : (
        <ul className="mt-2 space-y-3">
          {marked.map((note) => (
            <li key={note.id}>
              <SettlementNoteView
                label="Note to client"
                clauseNumber={note.clauseNumber}
                clauseHeading={headingOf(note.clauseNumber)}
                text={note.text}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
