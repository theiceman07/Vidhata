import { GlowBackdrop } from "./glow-backdrop";

/**
 * How a public page other than the landing page begins: the landing page's
 * section header, set on the warm wash. The title holds the left column, the
 * lead starts on the centre line and sits on the title's last baseline, and
 * anything the page wants directly under them (a strip of facts) follows.
 */
export function PageOpening({
  label,
  title,
  lead,
  children,
}: {
  /** What kind of page this is, only where the title does not say. */
  label?: string;
  title: React.ReactNode;
  lead: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <GlowBackdrop>
      <section className="site-wrap pb-20 pt-24 md:pb-24 md:pt-32">
        <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2 lg:items-end lg:[align-items:last_baseline]">
          <div>
            {label && (
              <p className="mb-6 inline-flex rounded-full bg-ink/[0.06] px-3 py-1 text-meta font-medium text-ink">
                {label}
              </p>
            )}
            <h1 className="text-balance font-display text-display text-ink">{title}</h1>
          </div>
          <p className="max-w-xl text-lead text-muted-fg">{lead}</p>
        </div>
        {children && <div className="mt-14">{children}</div>}
      </section>
    </GlowBackdrop>
  );
}
