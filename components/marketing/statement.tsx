import { Highlight } from "./highlight";
import { Reveal } from "./reveal";

/** The product in one sentence, set large, between the hero and the steps. */
export function Statement() {
  return (
    <section className="site-wrap pb-20 pt-4 md:pb-28 md:pt-8">
      <Reveal>
        <p className="max-w-[1400px] text-balance font-display text-statement text-ink">
          Vidhataa drafts the contract and screens it against Indian statute.{" "}
          <Highlight>A named advocate</Highlight> settles every finding and signs
          off before it reaches you.
        </p>
      </Reveal>
    </section>
  );
}
