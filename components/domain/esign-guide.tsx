"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ESIGN_EXCLUSIONS, ESIGN_LEGAL_NOTE } from "@/lib/config/esign";

/** What the preview step says, here and in any test that holds it. */
export const ESIGN_PREVIEW_NOTE =
  "No signature is taken here, and no signing service is connected.";

/**
 * What a client needs at the e-signature step: which classes of document
 * cannot be signed electronically (with the note that the list needs legal
 * confirmation) and a way to see how signing works in this preview.
 *
 * "Sign electronically (preview)" opens a step that does nothing but say so.
 * It names no provider and takes no signature. The client signs by whatever
 * means they use, and confirms at the step that both have, which is the
 * checklist's own tick-off.
 */
export function EsignGuide() {
  return (
    <div className="rounded-control bg-paper p-5 print:hidden">
      <p className="text-label font-medium text-muted-fg">Cannot be signed electronically</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {ESIGN_EXCLUSIONS.map((item) => (
          <li
            key={item}
            className="rounded-full border border-line px-2.5 py-1 text-label text-ink"
          >
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-label text-muted-fg">{ESIGN_LEGAL_NOTE}</p>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4 w-full">
            Sign electronically (preview)
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign electronically (preview)</DialogTitle>
            <DialogDescription>{ESIGN_PREVIEW_NOTE}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 text-meta text-ink">
            <li>1. Both signatories sign the settled document, by the means they use.</li>
            <li>2. Keep the signed copy and attach it to this step as proof.</li>
            <li>3. Come back and confirm that both have signed.</li>
          </ol>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
