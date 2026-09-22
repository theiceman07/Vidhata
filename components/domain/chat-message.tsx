import { Icon } from "@/components/shared/icon";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
  onCiteClick?: (clauseReference: string) => void;
}

export function ChatMessage({ message, onCiteClick }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-card px-4 py-3 text-body",
          isUser
            ? "bg-accent text-accent-fg"
            : "border border-line bg-paper text-ink shadow-card",
        )}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.citedClauseReference && (
          <button
            type="button"
            onClick={() => onCiteClick?.(message.citedClauseReference!)}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-small font-medium text-muted-fg transition-colors hover:bg-line"
          >
            <Icon name="description" size={16} />
            {message.citedClauseReference}
          </button>
        )}
      </div>
    </div>
  );
}
