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
    // Screening assigns the tier; the client does not choose it, so there is
    // nothing to switch.
    question: "How is my review tier decided?",
    answer:
      "You don't choose one. After the first pass, screening reads the type, value and risk of the deal and assigns the tier, so the level of review matches the document. It appears on your document once assigned. If you think it needs a different level of review, talk to your advocate.",
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
