// QA 10.3: the header/nav rendered "Vidhata" as plain text everywhere, with
// no mark and no single source of truth for the identity. This is still the
// only place the mark is defined; every nav wraps it in a Link to the
// role-appropriate home.
//
// Brand Board V2.0: a seal, not a logo. A framed serif initial in the
// engraved-plate manner, borrowed from the stamp at the foot of a signed
// instrument. One weight, one colour, no variants by portal: client and
// advocate are told apart by the badge beside the mark, never by a colour
// change. currentColor throughout, so the caller's own token drives it and
// no raw hex appears here.
//
// This is the wordmark used in navigation. The seal struck at sign-off is
// components/document/seal.tsx and appears once per document; the two are
// deliberately separate so the sign-off moment keeps its weight.
const SIZES = {
  sm: { icon: 20, text: "text-body" },
  md: { icon: 26, text: "text-h3" },
  lg: { icon: 32, text: "text-h1" },
} as const;

export function BrandLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof SIZES;
}) {
  const { icon, text } = SIZES[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        focusable="false"
        className="shrink-0"
      >
        {/* The frame. Never a tinted or rounded container: the board
            rules both out, so this stays a plain hairline square. */}
        <rect
          x="0.75"
          y="0.75"
          width="30.5"
          height="30.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <text
          x="16"
          y="17"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize="19"
          fontWeight="500"
          fontFamily="var(--font-newsreader), Georgia, serif"
        >
          V
        </text>
      </svg>
      <span className={`font-display ${text} leading-none`}>Vidhata</span>
    </span>
  );
}
