/**
 * TRIAL: a slow moving gradient behind a full-width section (.hero-glow in
 * globals.css). Used by the hero and the closing section. To remove it,
 * unwrap its two uses and delete the .hero-glow block.
 */
export function GlowBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="hero-glow">
        <span />
        <span />
        <span />
      </div>
      {children}
    </div>
  );
}
