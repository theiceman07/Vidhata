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
 * The foot of every public page, flat: one black field from edge to edge,
 * no panel, no grain, no shadow. The tagline and the link groups sit on
 * one line at the top, the legal row under a hairline, and the wordmark
 * closes the page as wide as the page is, cut off at the bottom edge.
 */
export function SiteFooter() {
  return (
    <footer data-nav-tone="dark" className="w-full overflow-hidden bg-night text-paper">
      <div className="site-wrap pt-20 md:pt-28">
        {/* One grid: the statement and the three link groups share a top
            edge, so every column starts on the same line. */}
        <div className="grid gap-x-10 gap-y-14 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="sm:col-span-3 lg:col-span-1">
            <p className="max-w-xl font-display text-h1 text-paper">
              No document reaches a client without an advocate&rsquo;s sign-off.
            </p>
            <p className="mt-5 max-w-sm text-meta text-paper/70">
              Contracts for Indian startups and MSMEs, drafted from a
              curated clause corpus, checked against Indian statute and
              signed off by an empanelled advocate.
            </p>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.label} aria-label={group.label}>
              <p className="text-label text-paper/60">{group.label}</p>
              <ul className="mt-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center rounded-full text-body text-paper transition-colors hover:text-paper/60 focus-visible:ring-offset-night active:text-paper/50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-paper/20 pt-5 text-meta text-paper/70 md:mt-28">
          <p>
            © {new Date().getFullYear()} Vidhata
            <span aria-hidden className="mx-1.5">·</span>
            India
          </p>
          <p>A technology provider to advocate-owned professional entities</p>
        </div>
      </div>

      {/* The name as a signature, as wide as the page and cropped on
          purpose: the box holds the top of the letters, so the cut is the
          same at every width. */}
      <div
        aria-hidden
        className="mt-10 h-[0.6em] select-none overflow-hidden whitespace-nowrap text-center font-wordmark text-[clamp(72px,30vw,620px)] leading-[0.8] tracking-[-0.02em] text-paper"
      >
        Vidhata
      </div>
    </footer>
  );
}
