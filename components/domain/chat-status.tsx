import { Button } from "@/components/ui/button";

/**
 * Shown while the agent reads the settled document for an answer. It carries no live role of
 * its own: a region that is mounted with its text is not reliably announced, so it is placed
 * inside the thread's persistent log, which announces it as it is added.
 */
export function ChatPending() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-card border border-line bg-paper px-4 py-3 text-small text-muted-fg">
        <span aria-hidden className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-fg motion-reduce:animate-none"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        Reading the settled document
      </div>
    </div>
  );
}

/** A question that could not be answered, stated plainly, with a way to put it again. */
export function ChatSendError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border-l-2 border-flagged py-1 pl-4">
      <p className="text-body text-ink">{message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11 sm:min-h-0" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
