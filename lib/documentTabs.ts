/**
 * The ways into a document, as a client sees them.
 *
 * Before a sign-off is recorded a client has the document's page and its
 * version history (the status, the passages behind requests addressed to them,
 * a version list with counts). Delivery, the summary, the execution checklist
 * and a consultation all rest on the settled text, so none of them exists until
 * there is a recorded advocate sign-off (CLAUDE.md, "State" and "Delivery").
 * The rule lives here, once, so no page decides it for itself.
 */
export interface DocumentTab {
  key: "overview" | "summary" | "checklist" | "history" | "consultation" | "delivery";
  label: string;
  /** Small count beside the label, such as "2/3" on the checklist. */
  badge?: string;
  href: string;
}

export function documentTabs({
  documentId,
  signedOff,
  checklist,
}: {
  documentId: string;
  /** A recorded advocate sign-off exists. */
  signedOff: boolean;
  /** Steps done and in all, shown beside the checklist when known. */
  checklist?: { done: number; total: number } | null;
}): DocumentTab[] {
  const base = `/documents/${documentId}`;
  const tabs: DocumentTab[] = [{ key: "overview", label: "Document", href: base }];

  if (signedOff) {
    tabs.push({ key: "summary", label: "Summary", href: `${base}/summary` });
    tabs.push({
      key: "checklist",
      label: "Checklist",
      badge: checklist ? `${checklist.done}/${checklist.total}` : undefined,
      href: `${base}/checklist`,
    });
  }

  tabs.push({ key: "history", label: "Version history", href: `${base}/history` });

  if (signedOff) {
    tabs.push({ key: "consultation", label: "Consultation", href: `${base}/consultation` });
    tabs.push({ key: "delivery", label: "Delivery", href: `${base}/delivery` });
  }

  return tabs;
}

/** The tab a path belongs to, or null (the chat page, for one, has none). */
export function activeTab(tabs: DocumentTab[], pathname: string): DocumentTab | null {
  const exact = tabs.find((t) => t.href === pathname);
  if (exact) return exact;
  return tabs.find((t) => t.key !== "overview" && pathname.startsWith(`${t.href}/`)) ?? null;
}
