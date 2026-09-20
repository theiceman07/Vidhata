// QA 10.3: the header/nav rendered "Vidhata" as plain text everywhere —
// no logo mark, no single source of truth for the identity. This is now
// the only place the mark is defined; every nav wraps it in a Link to the
// role-appropriate home. Uses currentColor throughout so the caller's own
// Tailwind text colour (text-brand, text-canvas, ...) drives it — no raw
// hex here (CLAUDE.md: Tailwind tokens only).
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
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        {/* Four-petal submark from the Figma brand guidelines (file
            hJG0r4wNbRXQnDKc3ciQCJ, node 3:3). Each petal is two lobes — an
            outer bulge and an inner edge held near the centre axis — so a
            thin vein of negative space runs tip-to-centre, matching the
            reference mark. Rotated 0/90/180/270 around the centre. */}
        {[0, 90, 180, 270].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            <path
              d="M50 4 C66 15 68 36 50 50 C55 36 55 16 50 4 Z"
              fill="currentColor"
            />
            <path
              d="M50 4 C34 15 32 36 50 50 C45 36 45 16 50 4 Z"
              fill="currentColor"
            />
          </g>
        ))}
      </svg>
      <span className={`font-display ${text}`}>Vidhata</span>
    </span>
  );
}
