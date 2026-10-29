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
 * Activity and Search are icon buttons beside it; the keyboard reference and
 * print stay behind the menu. Search and the shortcuts list keep their keys,
 * so nothing here is the only way to anything.
 */
export function WorkspaceMenu({
  activityOpen,
  onActivity,
  onSearch,
  onShortcuts,
  onAssistant,
  onPrint,
}: {
  activityOpen: boolean;
  onActivity: () => void;
  onSearch: () => void;
  onShortcuts: () => void;
  /** Where the assistant is not beside the document (below xl), the way to it. */
  onAssistant?: () => void;
  /** Print the document, for a reader who has it settled. */
  onPrint?: () => void;
}) {
  return (
    <>
      <BarButton
        icon="history"
        label={activityOpen ? "Hide activity" : "Activity"}
        pressed={activityOpen}
        onClick={onActivity}
      />
      <BarButton icon="search" label="Search" onClick={onSearch} />
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
          {onAssistant && (
            <Entry
              icon="rate_review"
              label="Ask about this document"
              onSelect={onAssistant}
              className="xl:hidden"
            />
          )}
          <Entry
            icon="keyboard"
            label="Keyboard shortcuts"
            onSelect={onShortcuts}
            hint="?"
          />
          {onPrint && <Entry icon="print" label="Print" onSelect={onPrint} />}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const BAR_BUTTON =
  "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent text-muted-fg hover:bg-parchment hover:text-ink";

function BarButton({
  icon,
  label,
  pressed,
  onClick,
}: {
  icon: IconName;
  label: string;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(BAR_BUTTON, pressed && "bg-parchment text-ink")}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

function Entry({
  icon,
  label,
  hint,
  onSelect,
  className,
}: {
  className?: string;
  icon: IconName;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className={cn("gap-3", className)}>
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
