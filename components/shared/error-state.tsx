import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /** State the fact. Never "something went wrong". */
  message: string;
  onRetry: () => void;
}

/**
 * A recoverable failure, stated plainly and with a way forward.
 *
 * Left-ruled in flagged ink rather than boxed and tinted: this is a
 * note about the document surface, not a separate object floating on
 * top of it.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="border-l-2 border-flagged py-6 pl-6">
        {/* The label is for a message that does not say so itself: most start with
            "Could not", and the same words twice read as a stutter. */}
        {!/^could not/i.test(message) && (
          <p className="mb-2 text-label font-medium text-flagged">Could not load</p>
        )}
        <p className="max-w-prose text-body text-ink">{message}</p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
