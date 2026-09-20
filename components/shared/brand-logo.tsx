// QA 10.3: the header/nav rendered "Vidhata" as plain text everywhere —
// no logo mark, no single source of truth for the identity. This is now
// the only place the mark is defined; every nav wraps it in a Link to the
// role-appropriate home. Uses currentColor throughout so the caller's own
// Tailwind text colour (text-brand, text-canvas, ...) drives it — no raw
// hex here (CLAUDE.md: Tailwind tokens only).
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <path
          d="M12 2 L21 6.5 V13 C21 18 17 21.5 12 22 C7 21.5 3 18 3 13 V6.5 Z"
          fill="currentColor"
          fillOpacity="0.16"
        />
        <path
          d="M12 6.5 L8 12 H11 L9.5 17.5 L16 10.5 H13 Z"
          fill="currentColor"
        />
      </svg>
      <span className="font-display">Vidhata</span>
    </span>
  );
}
