import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

/** What the preview says about downloads, here and in any test that holds it. */
export const DOWNLOADS_NOTE = "Downloads aren't enabled in this preview.";

/**
 * The settled document as a PDF or a Word file.
 *
 * Both are shown so a client can see what the real product will offer, and
 * neither works: nothing here builds a file, links to one or pretends to, and
 * the note says so beside them. They are disabled controls, not buttons that
 * answer with a toast, so nothing can be mistaken for a download that
 * happened.
 */
export function DownloadOptions({ compact = false }: { compact?: boolean }) {
  const buttons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size={compact ? "sm" : "default"} disabled aria-describedby="downloads-note">
        <Icon name="description" size={18} />
        PDF
      </Button>
      <Button variant="outline" size={compact ? "sm" : "default"} disabled aria-describedby="downloads-note">
        <Icon name="description" size={18} />
        Word
      </Button>
    </div>
  );
  if (compact) {
    // One control; the note is its tooltip and its description, not a sentence beside it.
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled
          title={DOWNLOADS_NOTE}
          aria-describedby="downloads-note"
        >
          <Icon name="description" size={18} />
          Download
        </Button>
        <span id="downloads-note" className="sr-only">
          {DOWNLOADS_NOTE}
        </span>
      </>
    );
  }
  return (
    <div>
      {buttons}
      <p id="downloads-note" className="mt-3 text-meta text-muted-fg">
        {DOWNLOADS_NOTE}
      </p>
    </div>
  );
}
