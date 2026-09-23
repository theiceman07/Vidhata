"use client";

import { Icon } from "@/components/shared/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Keyboard shortcuts are an enhancement, not the way through the work.
 *
 * Every one of them has a visible control elsewhere on the screen, so
 * this is a reference rather than an instruction. It sits behind one
 * quiet button instead of scattering loose letter labels across the
 * chrome, where they read as notation nobody asked for.
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
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className="inline-flex items-center gap-2 rounded-control px-2 py-1.5 text-meta text-muted-fg transition-colors hover:bg-canvas hover:text-ink"
        aria-label="Keyboard shortcuts"
      >
        <Icon name="keyboard" size={18} />
        <span className="hidden sm:inline">Shortcuts</span>
      </PopoverTrigger>

      <PopoverContent>
        <p className="text-label font-medium text-muted-fg">Review controls</p>
        <dl className="mt-3 space-y-2">
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
        <p className="mt-4 border-t border-line pt-3 text-small text-muted-fg">
          Shortcuts stand down while you are typing.
        </p>
      </PopoverContent>
    </Popover>
  );
}
