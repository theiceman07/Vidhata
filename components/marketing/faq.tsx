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
      "No. Vidhataa is a technology provider to advocate-owned professional entities. We don't rank or market individual advocates.",
  },
  {
    question: "What kinds of contracts does Vidhataa handle?",
    answer:
      "The everyday contracts every founder negotiates 2 to 40 times a year: NDAs, SOWs, vendor agreements and MSAs. Not litigation, not regulated filings, not cross-border work.",
  },
  {
    question: "What happens if a citation can't be verified?",
    answer:
      "It's held back, not guessed at. The citation gate, the fifth layer of the pipeline, stops it, and it goes to your advocate for judgment. It never reaches you disguised as settled.",
  },
  {
    question: "Is a Freemium draft safe to sign?",
    answer:
      "No, and we would rather say so. Freemium gives you the draft and the findings so you can see what the screen catches and negotiate from something real. An advocate has not read it. Every paid plan includes an advocate settling each finding and signing off under their Bar enrolment. That sign-off is the legal act, and Freemium does not have it.",
  },
  {
    question: "Which plan do I need?",
    answer:
      "The one that lists your agreement. Each plan covers a set of agreement types at one fixed price per contract, so you know the price before you start. Freemium includes AI drafting and a basic review with no advocate; every other plan includes an advocate's review.",
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
