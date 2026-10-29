import Link from "next/link";

// QA 7.2: the public pages had no Terms, Privacy or contact link at all —
// a regulatory-completion gap for a legal-services product. Terms/Privacy
// route to explicitly-marked placeholders (see app/(public)/terms and
// app/(public)/privacy) rather than invented legal copy: a legal
// product's own terms must be written or approved by a qualified person.
//
// "Draft a document" is not listed: it appears in the hero and the
// closing panel only.
const GROUPS = [
  {
    label: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#india", label: "India checks" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contracts", label: "Agreements" },
      { href: "/sample", label: "Sample document" },
    ],
  },
  {
    label: "Advocates",
    links: [
      { href: "/#advocates", label: "Empanelment" },
      { href: "/advocate-login", label: "Advocate login" },
      { href: "/advocate-invite", label: "Request an invitation" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/scope", label: "Scope and limits" },
      { href: "/security", label: "Security and data" },
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

/**
 * The foot of every public page: an ink panel, the same capsule family
 * as the nav, closing on the wordmark set large enough to hold the page.
 * It is a dark band, so the floating nav turns to meet it.
 */
export function SiteFooter() {
  return (
    <footer className="px-3 pb-3 sm:px-4 sm:pb-4">
      <div
        data-nav-tone="dark"
        className="tile-grain tile-grain-ink overflow-hidden rounded-modal bg-night text-paper"
      >
        <div className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-16">
          {/* One grid: the brand column and the three link groups share a
              top edge, so every column starts on the same line. */}
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <div className="sm:col-span-3 lg:col-span-1">
              <p className="font-display text-[clamp(20px,1.6vw,22px)] font-medium leading-[1.15] tracking-[-0.015em] text-paper">
                AI drafts. Advocates decide.
              </p>
              <p className="mt-4 max-w-sm text-meta text-paper/90">
                Contracts for Indian startups and MSMEs, drafted from a
                curated clause corpus, checked against Indian statute and
                signed off by an empanelled advocate.
              </p>
            </div>

            {GROUPS.map((group) => (
              <nav key={group.label} aria-label={group.label}>
                <p className="text-label font-semibold text-paper">
                  {group.label}
                </p>
                <ul className="mt-3 space-y-0.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center rounded-full text-meta text-paper/95 transition-colors hover:text-paper hover:underline hover:underline-offset-4 focus-visible:text-paper focus-visible:underline focus-visible:underline-offset-4 focus-visible:ring-offset-shell active:text-paper/70"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* The promise is the differentiator, so it sits as a line of its
              own above the legal row rather than inside it. */}
          <p className="mt-12 font-display text-h3 text-paper">
            No document reaches a client without an advocate&rsquo;s sign-off.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-paper/20 pt-5 text-meta text-paper/85">
            <p>
              © {new Date().getFullYear()} Vidhata
              <span aria-hidden className="mx-1.5 text-paper/60">·</span>
              India
            </p>
            <p>A technology provider to advocate-owned professional entities</p>
          </div>
        </div>

        {/* The name is a signature, cropped on purpose: the box is 0.56em
            tall and holds the top of the letters, so the cut is the same
            at every width and never depends on the panel edge. */}
        {/* An inner shadow, set into the letters from the top edge. The one
            shadow in the product, and only on this signature: an SVG filter
            (inverted alpha, blurred, offset, clipped back to the glyphs), so
            it follows the letterforms and nothing sits outside them. */}
        <svg aria-hidden focusable="false" width="0" height="0" className="absolute">
          <filter id="wordmark-inner" x="-2%" y="-2%" width="104%" height="104%">
            {/* Inverted alpha: the space around the letters. Offset and blurred, then
                clipped to the letters, it falls inward from the top-left edges. */}
            <feComponentTransfer in="SourceAlpha" result="inverse">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feGaussianBlur in="inverse" stdDeviation="3.5" result="soft" />
            <feOffset in="soft" dx="5" dy="6" result="dropped" />
            <feFlood floodOpacity="0.6" className="[flood-color:theme(colors.shell)]" result="ink" />
            <feComposite in="ink" in2="dropped" operator="in" result="shade" />
            <feComposite in="shade" in2="SourceAlpha" operator="in" result="inner" />
            {/* The edge that catches the light, bottom-right, so the letters read as pressed in. */}
            <feOffset in="soft" dx="-2" dy="-2" result="lifted" />
            <feFlood floodOpacity="0.9" className="[flood-color:theme(colors.surface)]" result="glow" />
            <feComposite in="glow" in2="lifted" operator="in" result="catch" />
            <feComposite in="catch" in2="SourceAlpha" operator="in" result="edge" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="edge" />
              <feMergeNode in="inner" />
            </feMerge>
          </filter>
        </svg>
        <div
          aria-hidden
          style={{ filter: "url(#wordmark-inner)" }}
          className="mt-8 h-[0.56em] select-none overflow-hidden text-center font-wordmark text-[clamp(72px,15vw,230px)] leading-[0.8] tracking-[0.02em] text-paper"
        >
          Vidhata
        </div>
      </div>
    </footer>
  );
}
