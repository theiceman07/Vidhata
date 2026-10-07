"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdvocateNote, NoteAccess } from "@/lib/types";
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
  access,
  onUpdate,
  onDelete,
}: {
  note: AdvocateNote;
  /** Whether the advocate may change this note, and why not. Absent means they may. */
  access?: NoteAccess;
  onUpdate: (text: string) => void | boolean | Promise<void | boolean>;
  onDelete: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const reasonId = useId();
  const blocked = access && !access.allowed ? access.reason : null;

  if (editing) {
    return (
      <NoteEditor
        initial={note.text}
        submitLabel="Save"
        onCancel={() => setEditing(false)}
        onSubmit={async (text) => {
          // A refusal leaves the editor open with the text, so nothing typed is lost.
          if ((await onUpdate(text)) !== false) setEditing(false);
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
      <div
        className={cn(
          "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 transition-opacity focus-within:opacity-100 group-hover/note:opacity-100",
          blocked ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          type="button"
          disabled={blocked !== null}
          aria-describedby={blocked ? reasonId : undefined}
          onClick={() => setEditing(true)}
          className="text-label text-muted-fg underline-offset-2 hover:text-ink hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={blocked !== null}
          aria-describedby={blocked ? reasonId : undefined}
          onClick={() => onDelete()}
          className="text-label text-muted-fg underline-offset-2 hover:text-flagged hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Remove
        </button>
        {blocked && (
          <span id={reasonId} className="text-label text-muted-fg">
            {blocked}
          </span>
        )}
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
  access,
}: {
  onAdd: (text: string) => void | boolean | Promise<void | boolean>;
  /** Shown at rest when the clause already carries notes or findings. */
  visible: boolean;
  /** Whether the advocate may add a note, and why not. Absent means they may. */
  access?: NoteAccess;
}) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  const blocked = access && !access.allowed ? access.reason : null;

  if (open) {
    return (
      <NoteEditor
        initial=""
        submitLabel="Add note"
        onCancel={() => setOpen(false)}
        onSubmit={async (text) => {
          // A refusal leaves the composer open with the text, so nothing typed is lost.
          if ((await onAdd(text)) !== false) setOpen(false);
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 transition-opacity focus-within:opacity-100",
        visible ? "opacity-100" : "opacity-0 group-hover/clause:opacity-100",
      )}
    >
      <button
        type="button"
        disabled={blocked !== null}
        aria-describedby={blocked ? reasonId : undefined}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-label text-muted-fg transition-opacity hover:bg-parchment hover:text-ink focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon name="sticky_note_2" size={16} />
        Add a note
      </button>
      {blocked && (
        <span id={reasonId} className="text-label text-muted-fg">
          {blocked}
        </span>
      )}
    </div>
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
