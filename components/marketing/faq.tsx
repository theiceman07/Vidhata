import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Is this a marketplace that ranks advocates?",
    answer:
      "No. Vidhata is a technology provider to advocate-owned professional entities. We don't rank or market individual advocates.",
  },
  {
    question: "What kinds of contracts does Vidhata handle?",
    answer:
      "The everyday contracts every founder negotiates 2 to 40 times a year: NDAs, SOWs, vendor agreements and MSAs. Not litigation, not regulated filings, not cross-border work.",
  },
  {
    question: "What happens if a citation can't be verified?",
    answer:
      "It's blocked, not guessed at. A blocked citation is shown clearly and routed to your advocate for judgment. It never reaches you disguised as settled.",
  },
  {
    // The tier is chosen at intake; a mid-review change flow does not exist
    // yet, so the answer says that plainly.
    question: "Can I switch tiers after starting a deal?",
    answer:
      "The review tier is chosen when you start a deal. Changing tiers mid-review isn't supported yet. Talk to your advocate if a document turns out to need a different level of review.",
  },
];

/** Each question is its own rounded row, so the list reads as tiles. */
export function Faq({ className }: { className?: string }) {
  return (
    <Accordion type="single" collapsible className={cn("space-y-3", className)}>
      {FAQS.map((f, i) => (
        <AccordionItem
          key={f.question}
          value={`item-${i}`}
          className="rounded-card border border-line bg-paper px-6 data-[state=open]:border-ink/30"
        >
          <AccordionTrigger className="py-5 text-left text-body font-medium text-ink hover:no-underline">
            {f.question}
          </AccordionTrigger>
          <AccordionContent className="max-w-2xl pb-6 text-body text-muted-fg">
            {f.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
