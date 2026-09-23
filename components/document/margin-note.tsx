"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdvocateNote } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * An advocate's note, stuck in the margin beside the clause it is about.
 *
 * Working paper, not record: it is the advocate's alone, never shown to
 * the client, and it is not a finding. So it is set apart from the
 * findings above it, on parchment, in the advocate's own words, with no
 * severity and no state.
 */
export function MarginNote({
  note,
  onUpdate,
  onDelete,
}: {
  note: AdvocateNote;
  onUpdate: (text: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <NoteEditor
        initial={note.text}
        submitLabel="Save"
        onCancel={() => setEditing(false)}
        onSubmit={async (text) => {
          await onUpdate(text);
          setEditing(false);
        }}
      />
    );
  }

  const edited = note.updatedAt !== note.createdAt;

  return (
    <div className="group/note rounded-control bg-parchment px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-label text-muted-fg">
        <Icon name="sticky_note_2" size={16} />
        Your note · {format(new Date(note.updatedAt), "d MMM")}
        {edited && " · edited"}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-meta text-ink">{note.text}</p>
      <div className="mt-2 flex gap-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover/note:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-label text-muted-fg underline-offset-2 hover:text-ink hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete()}
          className="text-label text-muted-fg underline-offset-2 hover:text-flagged hover:underline"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/**
 * The quiet way in: a line in the margin that appears when the reader is
 * on the clause, and opens a note in place.
 */
export function AddMarginNote({
  onAdd,
  visible,
}: {
  onAdd: (text: string) => void | Promise<void>;
  /** Shown at rest when the clause already carries notes or findings. */
  visible: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <NoteEditor
        initial=""
        submitLabel="Add note"
        onCancel={() => setOpen(false)}
        onSubmit={async (text) => {
          await onAdd(text);
          setOpen(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-label text-muted-fg transition-opacity hover:bg-parchment hover:text-ink focus-visible:opacity-100",
        visible ? "opacity-100" : "opacity-0 group-hover/clause:opacity-100",
      )}
    >
      <Icon name="sticky_note_2" size={16} />
      Add a note
    </button>
  );
}

function NoteEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const ready = text.trim().length > 0;

  async function submit() {
    if (!ready || saving) return;
    setSaving(true);
    try {
      await onSubmit(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-control bg-parchment p-2.5">
      <label className="sr-only" htmlFor="margin-note-editor">
        Your note
      </label>
      <Textarea
        id="margin-note-editor"
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        placeholder="Only you will see this"
        className="min-h-0 text-meta"
      />
      <div className="mt-2 flex items-center justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={!ready || saving}>
          {saving ? "Saving" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
