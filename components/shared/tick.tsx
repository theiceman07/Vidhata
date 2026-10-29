import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";

/**
 * The one marker for a step or a list item, in the same four states
 * everywhere (the stepper, the execution checklist, the intake steps):
 *   done     a filled green circle with a white check
 *   current  a blue ring with a dot
 *   move     the client's turn: a marigold fill
 *   ahead    a muted outline, holding its number if it has one
 *   na       not required
 * Colour never stands alone: a done tick carries the check, the current
 * one the dot, and callers put the words beside them.
 */
export type TickState = "done" | "current" | "move" | "ahead" | "na";

const SIZE = {
  sm: { box: "h-5 w-5", icon: 16 as const, dot: "h-1.5 w-1.5" },
  md: { box: "h-6 w-6", icon: 16 as const, dot: "h-2 w-2" },
  lg: { box: "h-7 w-7", icon: 18 as const, dot: "h-2 w-2" },
  xl: { box: "h-9 w-9", icon: 20 as const, dot: "h-2.5 w-2.5" },
};

export function Tick({
  state,
  size = "sm",
  label,
  children,
  className,
}: {
  state: TickState;
  size?: keyof typeof SIZE;
  /** Only when the tick stands alone with no words beside it. */
  label?: string;
  /** A number or mark shown inside a current, move or ahead tick instead of the default. */
  children?: React.ReactNode;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <span
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full",
        "font-mono text-label leading-none",
        s.box,
        state === "done" && "bg-done text-white",
        state === "current" && "bg-surface text-progress ring-2 ring-inset ring-progress",
        state === "move" && "bg-move text-white ring-4 ring-move/20",
        state === "ahead" && "bg-surface text-muted ring-1 ring-inset ring-muted/70",
        state === "na" && "bg-sand text-muted ring-1 ring-inset ring-line",
        className,
      )}
    >
      {state === "done" && <Icon name="check" size={s.icon} />}
      {state === "na" && <Icon name="remove" size={s.icon} />}
      {state === "current" &&
        (children ?? <span className={cn("rounded-full bg-progress", s.dot)} />)}
      {state === "move" && (children ?? <Icon name="reply" size={s.icon} />)}
      {state === "ahead" && children}
    </span>
  );
}
