"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Keyboard shortcuts are an enhancement, not the way through the work.
 *
 * Every one of them has a visible control elsewhere on the screen, so
 * this is a reference rather than an instruction. It opens from the
 * workspace's More menu, or from the ? key, instead of scattering loose
 * letter labels across the chrome, where they read as notation nobody
 * asked for.
 */
const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["J"], action: "Next finding" },
  { keys: ["K"], action: "Previous finding" },
  { keys: ["C"], action: "Settle the finding in hand" },
  { keys: ["Esc"], action: "Close the finding" },
  { keys: ["?"], action: "Open this list" },
  { keys: ["Ctrl", "K"], action: "Search clauses, findings and commands" },
];

export function ReviewShortcuts({
  open,
  onOpenChange,
  /** The client reads the document; only an advocate settles. */
  includeSettle = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  includeSettle?: boolean;
}) {
  const shortcuts = includeSettle
    ? SHORTCUTS
    : SHORTCUTS.filter((s) => s.keys[0] !== "C");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-label font-medium text-muted-fg">Review controls</DialogTitle>
        <DialogDescription className="sr-only">The keys that move through the review.</DialogDescription>
        <dl className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.action} className="flex items-baseline gap-3">
              <dt className="flex w-20 shrink-0 gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded-control border border-line bg-canvas px-1.5 py-0.5 font-mono text-label text-ink"
                  >
                    {key}
                  </kbd>
                ))}
              </dt>
              <dd className="text-meta text-ink">{shortcut.action}</dd>
            </div>
          ))}
        </dl>
        <p className="text-meta text-muted-fg">Shortcuts stand down while you are typing.</p>
      </DialogContent>
    </Dialog>
  );
}
