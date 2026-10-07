"use client";

import { useMemo } from "react";
import { workspaceDocOf, workspaceNumbering } from "@/lib/client-workspace";
import type { ClientAuditEntry, ClientDocument, ClientSettlementNote } from "@/lib/types";
import { DocumentWorkspace } from "./workspace";

/**
 * A client's settled document: the shared workspace, read-only, fed from what a
 * client has.
 *
 * It takes a ClientDocument and the client's own trail, and hands the workspace
 * only those (lib/client-workspace.ts), with the client's own numbering. The
 * workspace builds nothing for a client from a record it was never given, so the
 * advocate's decisions, the rule machinery and the full trail are not there to
 * leak.
 */
export function ClientReader({
  doc,
  trail,
  settlementNotes = [],
  ...rest
}: {
  doc: ClientDocument;
  trail: ClientAuditEntry[];
  /** The advocate's notes to the client, released at sign-off. None before it. */
  settlementNotes?: ClientSettlementNote[];
} & Pick<
  React.ComponentProps<typeof DocumentWorkspace>,
  "back" | "aside" | "companion" | "actions" | "commands"
>) {
  const workspaceDoc = useMemo(() => workspaceDocOf(doc), [doc]);
  const numbering = useMemo(() => workspaceNumbering(doc), [doc]);

  return (
    <DocumentWorkspace
      doc={workspaceDoc}
      role="client"
      numbering={numbering}
      // A finding is held under its number, so an entry names it by that.
      trail={trail.map((e) => ({ ...e, findingId: e.findingNumber }))}
      // Named by the sign-off record, which already names the advocate. Before sign-off there
      // are no notes and no record, so nothing is passed, and nothing is said of them.
      settlementNotes={
        doc.signOff && settlementNotes.length > 0
          ? { items: settlementNotes, label: `Your advocate's note · ${doc.signOff.advocate}` }
          : undefined
      }
      {...rest}
    />
  );
}
