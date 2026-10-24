import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/shared/icon";
import { Gloss } from "@/components/shared/gloss";
import { StateLabel } from "@/components/document/state-label";
import { useCalm } from "@/components/domain/calm";
import { tierLabel } from "@/lib/config/pricing";
import { DOCUMENT_TONE, TONE, type Tone } from "@/lib/tone";
import type { ClientDocument } from "@/lib/types";

/**
 * The first thing on a document page, before the record: the state, who has
 * the move, and what happens next. A client who reads nothing else still
 * knows whether to act.
 *
 * Tone follows the move: marigold when it is the client's, blue while it is
 * the advocate's. Words and icons say the same, so colour is never alone.
 */
type Mover = "you" | "advocate" | "none";

interface Hero {
  headline: string;
  mover: Mover;
  move: string;
  next: React.ReactNode;
}

const MOVER_ICON: Record<Mover, IconName> = {
  you: "reply",
  advocate: "rate_review",
  none: "hourglass_top",
};

const MOVER_LABEL: Record<Mover, string> = {
  you: "Your move",
  advocate: "Advocate's move",
  none: "Nothing needed from you",
};

function heroFor(doc: ClientDocument): Hero | null {
  switch (doc.status) {
    case "draft":
      return {
        headline: "Not submitted yet",
        mover: "you",
        move: "Submit it for screening",
        next: "Nothing reaches an advocate until you submit it.",
      };
    case "analysing":
      return {
        headline: "Screening your draft",
        mover: "none",
        move: "The first pass is running",
        next: "When screening ends you pay the fee, then it joins the advocate queue.",
      };
    case "awaiting_payment":
      return {
        headline: "Screened, waiting for your payment",
        mover: "you",
        move: "Pay the fee",
        next: "Once it is paid, it joins the advocate queue.",
      };
    case "pending_review":
      return {
        headline: "In the advocate queue",
        mover: "advocate",
        move: "An advocate claims it",
        next: (
          <>
            An <Gloss term="empanelled" /> advocate settles each{" "}
            <Gloss term="finding" />. You read the document after{" "}
            <Gloss term="sign-off" />.
          </>
        ),
      };
    case "under_review":
      return {
        headline: "With your advocate",
        mover: "advocate",
        move: "Settling each finding",
        next: (
          <>
            You read the document after <Gloss term="sign-off" />. If your advocate needs
            an answer, it appears here.
          </>
        ),
      };
    case "revision": {
      const n = doc.findingList.filter((f) => f.request && !f.request.response).length;
      return {
        headline: "Your advocate needs your answer",
        mover: "you",
        move: `Answer ${n} ${n === 1 ? "request" : "requests"}`,
        next: `Your answers go back together, and it becomes Draft ${doc.version + 1} before sign-off.`,
      };
    }
    default:
      return null;
  }
}

export function StatusHero({ doc, className }: { doc: ClientDocument; className?: string }) {
  const hero = heroFor(doc);
  if (!hero) return null;
  const tone: Tone = DOCUMENT_TONE[doc.status].tone;

  return (
    <section
      aria-labelledby="hero-title"
      className={cn("rounded-modal border p-6 md:p-8", TONE[tone].panel, className)}
    >
      <StateLabel state={doc.status} />
      <h2 id="hero-title" className="mt-3 font-display text-h1 text-ink">
        {hero.headline}
      </h2>

      <div className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
        <div className="flex items-start gap-3">
          <Icon name={MOVER_ICON[hero.mover]} size={24} className={cn("mt-0.5", TONE[tone].text)} />
          <div className="min-w-0">
            <p className="text-label font-medium text-muted">Who has the move</p>
            <div className="mt-0.5 text-body font-medium text-ink">
              {MOVER_LABEL[hero.mover]}
              <span className="block text-meta font-normal text-ink">{hero.move}</span>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Icon name="arrow_forward" size={24} className="mt-0.5 text-muted" />
          <div className="min-w-0">
            <p className="text-label font-medium text-muted">What happens next</p>
            <div className="mt-0.5 max-w-measure text-body text-ink">{hero.next}</div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-meta text-muted">
        Submitted {format(new Date(doc.createdAt), "d MMM yyyy")}
        <span aria-hidden className="mx-1.5">·</span>
        {tierLabel(doc.tier)} review
      </p>
    </section>
  );
}

/**
 * The same three facts as StatusHero, as a slim strip under the title: the
 * state and headline, who has the move, and what happens next. Cells are
 * set apart by 1px dividers and carry no fill. The submitted date and tier
 * live in the page's subtitle line, not here.
 */
const BADGE_TONE: Record<Tone, string> = {
  move: "bg-move text-ink",
  done: "bg-mint text-night",
  progress: "bg-paper/15 text-paper",
  blocked: "bg-paper/15 text-paper",
  neutral: "bg-paper/15 text-paper",
};

export function StatusStrip({ doc, className }: { doc: ClientDocument; className?: string }) {
  const hero = heroFor(doc);
  if (!hero) return null;
  const { text, tone, icon } = DOCUMENT_TONE[doc.status];
  const yours = hero.mover === "you";

  return (
    <section
      aria-labelledby="hero-title"
      className={cn("tile-grain tile-grain-ink relative overflow-hidden rounded-modal bg-night p-6 text-paper md:px-8 md:py-5", className)}
    >
      <div className="grid items-center gap-x-12 gap-y-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2 pr-3 text-label font-medium",
              BADGE_TONE[tone],
            )}
          >
            <Icon name={icon} size={16} />
            {text}
          </span>
          <h2 id="hero-title" className="mt-3 font-display text-[clamp(28px,2.6vw,38px)] font-medium leading-[1.08] tracking-[-0.02em]">
            {hero.headline}
          </h2>
        </div>

        <div className="grid gap-5 border-paper/15 max-md:border-t max-md:pt-6 md:border-l md:pl-10">
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                yours ? "bg-move text-ink" : "bg-paper/15 text-paper",
              )}
            >
              <Icon name={MOVER_ICON[hero.mover]} size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-label text-paper/70">Who has the move</p>
              <div className="font-display text-h3 font-medium leading-tight">
                {MOVER_LABEL[hero.mover]}
                <span className="ml-2 font-sans text-meta font-normal text-paper/80">{hero.move}</span>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper/15 text-paper">
              <Icon name="arrow_forward" size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-label text-paper/70">What happens next</p>
              <div className="text-meta leading-[1.5]">{hero.next}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Three facts a client keeps asking about, as icons and short words, not a paragraph. */
export function Assurances({ className }: { className?: string }) {
  const items: { icon: IconName; text: React.ReactNode }[] = [
    {
      icon: "lock",
      text: (
        <>
          No draft shown until <Gloss term="sign-off" />
        </>
      ),
    },
    { icon: "person", text: "One advocate holds it alone" },
    {
      icon: "description",
      text: (
        <>
          You receive the settled document and an <Gloss term="execution checklist" />
        </>
      ),
    },
  ];
  const calm = useCalm();
  if (calm) {
    return (
      <ul className={cn("grid gap-y-3 sm:grid-cols-3 sm:divide-x sm:divide-calm-divider", className)}>
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 sm:px-5 sm:first:pl-0 sm:last:pr-0">
            <Icon name={item.icon} size={16} className="mt-0.5 text-calm-strong" />
            <span className="text-meta leading-5 text-calm-ink">{item.text}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 rounded-card bg-sand px-4 py-3.5">
          <Icon name={item.icon} size={20} className="mt-0.5 text-brand" />
          <span className="text-meta text-ink">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
