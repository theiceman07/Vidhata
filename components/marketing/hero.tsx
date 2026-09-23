import { DealPrompt } from "./deal-prompt";

/**
 * The hero: one line, and the way in.
 *
 * The primary action is the prompt itself: describe the deal and intake
 * starts from what you wrote. Everything else the page has to say is
 * told as the visitor scrolls.
 */
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <div className="flex min-h-[calc(100svh-6rem)] flex-col items-center justify-center py-20 text-center">
        <h1 className="max-w-4xl font-display text-[clamp(44px,6.4vw,92px)] font-medium leading-[1] tracking-[-0.03em] text-ink">
          AI drafts. <em className="italic">Advocates</em> decide.
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-lead text-ink/70">
          Describe the deal. Vidhata drafts it, and a named advocate signs off.
        </p>
        <DealPrompt className="mt-10" destination="/login" />
      </div>
    </section>
  );
}
