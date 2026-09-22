import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

// QA 7.2: the public pages had no Terms, Privacy or contact link at all —
// a regulatory-completion gap for a legal-services product. Terms/Privacy
// route to explicitly-marked placeholders (see app/(public)/terms and
// app/(public)/privacy) rather than invented legal copy: a legal
// product's own terms must be written or approved by a qualified person.
const GROUPS = [
  {
    label: "Product",
    links: [
      { href: "/#arc", label: "How it works" },
      { href: "/#india", label: "India checks" },
      { href: "/pricing", label: "Pricing" },
      { href: "/new", label: "Start a document" },
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

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[95rem] px-6 py-16 lg:px-10">
        <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,12rem))]">
          <div className="text-ink">
            <BrandLogo size="md" />
            <p className="mt-3 max-w-xs text-meta text-muted-fg">
              AI drafts. Advocates decide.
            </p>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.label} aria-label={group.label}>
              <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
                {group.label}
              </p>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-meta text-ink transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-16 border-t border-line pt-6 font-mono text-notation uppercase tracking-notation text-muted-fg">
          © {new Date().getFullYear()} Vidhata
          <span className="mx-2 text-line">·</span>
          India
        </p>
      </div>
    </footer>
  );
}
