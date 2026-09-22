import { cn } from "@/lib/utils";

/**
 * Google Material Symbols Outlined, the board's one icon family.
 *
 * One icon is one concept. The names below are the entire vocabulary the
 * product uses, and the font request is subset to exactly this list, so
 * adding an icon is a deliberate act: add the name here (kept in
 * alphabetical order, which the subset API requires) and it is both
 * typed and downloaded. An icon that is not listed cannot be rendered.
 */
export const ICON_NAMES = [
  "add",
  "check",
  "check_circle",
  "chevron_left",
  "chevron_right",
  "close",
  "description",
  "error",
  "expand_less",
  "expand_more",
  "info",
  "keyboard",
  "keyboard_arrow_down",
  "keyboard_arrow_up",
  "left_panel_close",
  "left_panel_open",
  "logout",
  "mail",
  "note_add",
  "person",
  "print",
  "remove",
  "send",
  "settings",
  "swap_horiz",
  "warning",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** One weight, no fill, no grade: icons carry function, not emphasis. */
export const MATERIAL_SYMBOLS_HREF = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${ICON_NAMES.join(",")}&display=block`;

export function Icon({
  name,
  size = 20,
  label,
  className,
}: {
  name: IconName;
  /** 20 for interface controls, 24 at most. 16 only inside dense text. */
  size?: 16 | 18 | 20 | 24;
  /**
   * Only when the icon stands alone and its meaning is not carried by
   * adjacent text. Otherwise the icon is decorative and hidden.
   */
  label?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn(
        "material-symbols-outlined inline-block shrink-0 select-none overflow-hidden leading-none",
        className,
      )}
      style={{ fontSize: size, width: size, height: size }}
    >
      {name}
    </span>
  );
}
