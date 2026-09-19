import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      "It's blocked, not guessed at. A blocked citation is shown clearly and routed to your advocate for judgment — it never reaches you disguised as settled.",
  },
  {
    question: "Can I switch tiers after starting a deal?",
    answer:
      "Yes — reach out to your advocate during review and they can move the document to a higher tier if the complexity warrants it.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="mx-auto max-w-2xl">
      {FAQS.map((f, i) => (
        <AccordionItem key={f.question} value={`item-${i}`}>
          <AccordionTrigger className="text-left text-body font-medium text-ink">
            {f.question}
          </AccordionTrigger>
          <AccordionContent className="text-body text-muted-fg">
            {f.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
