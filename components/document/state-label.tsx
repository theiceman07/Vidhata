import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/types";
import type { FindingState } from "@/lib/findings";
import { Icon, type IconName } from "@/components/shared/icon";
import { DOCUMENT_TONE, FINDING_TONE, TONE, type Tone } from "@/lib/tone";

/**
 * A workflow state: a tinted chip, an icon and the words.
 *
 * Document and finding states each have their own words here, and they
 * are never merged into one "status": a document can be with the client
 * while one of its findings is still open with the advocate, and the
 * screen has to be able to say both.
 *
 * Colour is carried by the tone (lib/tone.ts) and is never the only signal:
 * the icon and the word say the same thing.
 */
export type LabelState = DocumentStatus | FindingState;

function read(state: LabelState) {
  return state in DOCUMENT_TONE
    ? DOCUMENT_TONE[state as DocumentStatus]
    : FINDING_TONE[state as FindingState];
}

export function stateText(state: LabelState): string {
  return read(state).text;
}

/** The chip itself, for states that are not a document or finding state. */
export function Chip({
  tone,
  icon,
  children,
  variant = "tinted",
  className,
}: {
  tone: Tone;
  icon: IconName;
  children: React.ReactNode;
  variant?: "tinted" | "solid";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border py-0.5 pl-1.5 pr-2.5",
        "text-label font-medium",
        variant === "solid" ? TONE[tone].solid : TONE[tone].chip,
        className,
      )}
    >
      <Icon name={icon} size={16} className="[font-variation-settings:'wght'_500]" />
      {children}
    </span>
  );
}

export function StateLabel({
  state,
  variant = "tinted",
  className,
}: {
  state: LabelState;
  /**
   * Solid is reserved for the one authoritative moment on a screen,
   * in practice sign-off. Everywhere else the tinted chip keeps colour quiet
   * enough that it still means something when it appears.
   */
  variant?: "tinted" | "solid";
  className?: string;
}) {
  const { text, tone, icon } = read(state);
  return (
    <Chip tone={tone} icon={icon} variant={variant} className={className}>
      {text}
    </Chip>
  );
}
