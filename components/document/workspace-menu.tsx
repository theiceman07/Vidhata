"use client";

import { Icon, type IconName } from "@/components/shared/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The workspace's quiet controls behind one button.
 *
 * Activity, Search and the keyboard reference are things a reader reaches for
 * now and then, so they share one menu and leave the header's line to the
 * document's own actions (Claim, Settle, Sign off), which stay in plain sight.
 * Search and the shortcuts list keep their keys, so nothing here is the only
 * way to anything.
 */
export function WorkspaceMenu({
  activityOpen,
  onActivity,
  onSearch,
  onShortcuts,
}: {
  activityOpen: boolean;
  onActivity: () => void;
  onSearch: () => void;
  onShortcuts: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More"
        title="More"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "text-muted-fg hover:bg-parchment hover:text-ink data-[state=open]:bg-parchment data-[state=open]:text-ink",
        )}
      >
        <Icon name="more_horiz" size={20} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Entry icon="history" label={activityOpen ? "Hide activity" : "Activity"} onSelect={onActivity} />
        <Entry icon="search" label="Search" onSelect={onSearch} />
        <Entry icon="keyboard" label="Keyboard shortcuts" onSelect={onShortcuts} hint="?" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Entry({
  icon,
  label,
  hint,
  onSelect,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="gap-3">
      <Icon name={icon} size={18} className="text-muted-fg" />
      <span className="flex-1">{label}</span>
      {hint && (
        <kbd className="rounded-control border border-line px-1.5 font-mono text-label text-muted-fg">
          {hint}
        </kbd>
      )}
    </DropdownMenuItem>
  );
}
