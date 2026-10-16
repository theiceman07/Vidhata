"use client";

import { ChatCitations, ChatMessage } from "@/components/domain/chat-message";
import { ChatPending, ChatSendError } from "@/components/domain/chat-status";
import { EscalationPrompt } from "@/components/domain/escalation-prompt";
import type { ChatCitationView, ChatMessage as ChatMessageType } from "@/lib/types";

/**
 * Development-only: every state of the chat thread, side by side, including ones the mock agent
 * never produces (several citations on one answer, a long clause reference). For checking
 * layout at a phone's width; the thread itself is exercised on the document's own screens.
 */

const SEVERAL: ChatCitationView[] = [
  { clauseReference: "Clause 4.1", quote: "Payment shall be made within sixty (60) days of receipt of a valid invoice." },
  { clauseReference: "Clause 4.2", quote: "Disputed invoices are paid within thirty (30) days of the dispute being resolved." },
  { clauseReference: "Clause 11.4.2(b)", quote: "Interest accrues on any overdue sum at one per cent a month, compounded monthly." },
  { clauseReference: "Summary", quote: "The agreement sets 60-day payment terms with monthly interest on late sums." },
];

const agent = (over: Partial<ChatMessageType>): ChatMessageType => ({
  id: "x",
  role: "agent",
  text: "",
  citedClauseReference: null,
  isEscalation: false,
  ...over,
});

const MESSAGES: { label: string; message: ChatMessageType }[] = [
  { label: "A question", message: { id: "u", role: "user", text: "When do I have to pay, and what happens if I am late?", citedClauseReference: null, isEscalation: false } },
  {
    label: "Answered, several citations",
    message: agent({
      status: "answered",
      text: "Payment is due within 60 days of a valid invoice (clause 4.1). A disputed invoice is paid 30 days after the dispute is resolved (clause 4.2). Overdue sums carry interest of one per cent a month (clause 11.4.2(b)).",
      citedClauseReference: "Clause 4.1",
      citations: SEVERAL,
    }),
  },
  { label: "Refused", message: agent({ status: "refused", text: "I could not tell what you are asking. Try naming a clause or a term." }) },
];

export default function ChatStatesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <p className="text-meta text-muted-fg">Development only. The chat thread&apos;s states, at whatever width this window is.</p>

      <section aria-label="The page's thread" className="space-y-3 rounded-card border border-line bg-paper p-4 shadow-card">
        <h2 className="text-label font-medium text-muted-fg">The chat page</h2>
        {MESSAGES.map((m) => (
          <ChatMessage key={m.label} message={m.message} onCiteClick={() => {}} />
        ))}
        <EscalationPrompt advocateName="Rhea Kapoor" href="/documents/doc-nda-settled/consultation" />
        <ChatPending />
        <ChatSendError message="Something went wrong. Please try again." onRetry={() => {}} />
      </section>

      <section aria-label="The docked agent's citations" className="rounded-card border border-line bg-paper p-4">
        <h2 className="text-label font-medium text-muted-fg">The docked agent&apos;s citations</h2>
        <ChatCitations citations={SEVERAL} variant="docked" onCite={() => {}} />
      </section>
    </div>
  );
}
