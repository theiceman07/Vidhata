import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/shared/text-link";
import { supportEmail } from "@/lib/config/contact";

interface ErrorStateProps {
  /** State the fact. Never "something went wrong". */
  message: string;
  onRetry: () => void;
  /** A request or error id to quote to support, when the failure came with one. */
  reference?: string;
}

/**
 * A recoverable failure, stated plainly and with a way forward.
 *
 * Left-ruled in flagged ink rather than boxed and tinted: this is a
 * note about the document surface, not a separate object floating on
 * top of it.
 */
export function ErrorState({ message, onRetry, reference }: ErrorStateProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Announced when it replaces the page: a screen reader is otherwise left on silence. */}
      <div role="alert" className="border-l-2 border-flagged py-6 pl-6">
        {/* The label is for a message that does not say so itself: most start with
            "Could not", and the same words twice read as a stutter. */}
        {!/^could not/i.test(message) && (
          <p className="mb-2 text-label font-medium text-ink">Could not load</p>
        )}
        <p className="max-w-prose text-body text-ink">{message}</p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
        <p className="mt-4 text-meta text-muted-fg">
          {supportEmail() ? (
            <>
              If it keeps happening, email <TextLink href={`mailto:${supportEmail()}`}>{supportEmail()}</TextLink>
              {reference ? <> and quote reference {reference}.</> : "."}
            </>
          ) : (
            reference ? <>Reference {reference}.</> : null
          )}
        </p>
      </div>
    </div>
  );
}
