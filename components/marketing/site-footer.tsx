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
    ],
  },
  {
    label: "Advocates",
    links: [
      { href: "/#advocates", label: "Empanelment" },
      { href: "/advocate-login", label: "Advocate login" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/contact", label: "Contact" },
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
        className="tile-grain overflow-hidden rounded-modal bg-ink text-paper"
      >
        <div className="mx-auto w-full max-w-6xl px-6 pt-16 md:pt-20">
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="max-w-md font-display text-h2 text-paper">
                AI drafts. Advocates decide.
              </p>
              <p className="mt-4 max-w-sm text-meta text-paper/60">
                Contracts for Indian startups and MSMEs, drafted from a
                curated clause corpus, checked against Indian statute and
                signed off by an empanelled advocate.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3">
              {GROUPS.map((group) => (
                <nav key={group.label} aria-label={group.label}>
                  <p className="text-label text-paper/45">{group.label}</p>
                  <ul className="mt-3 space-y-2">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="rounded-full text-meta text-paper/80 transition-colors hover:text-paper focus-visible:ring-offset-ink"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-paper/15 pt-6 text-label text-paper/50">
            <p>
              © {new Date().getFullYear()} Vidhata
              <span className="mx-1.5 text-paper/25">·</span>
              India
              <span className="mx-1.5 text-paper/25">·</span>
              A technology provider to advocate-owned professional entities
            </p>
            <p>No document reaches a client without an advocate&rsquo;s sign-off</p>
          </div>
        </div>

        {/* The name, set to the width of the panel and cut by its edge. */}
        <p
          aria-hidden
          className="-mb-[0.2em] mt-10 select-none text-center font-wordmark text-[clamp(88px,24vw,380px)] leading-[0.8] tracking-[-0.04em] text-paper"
        >
          Vidhata
        </p>
      </div>
    </footer>
  );
}
