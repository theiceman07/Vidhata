import type { SummaryItem } from "@/lib/types";

/**
 * How the lines of a summary are grouped on the page.
 *
 * Grouping is presentation only. It reads each line's label and changes nothing
 * about it: no line is dropped, reworded or reordered within its group, and a
 * label this list does not know goes under "Other terms", after the rest, so a
 * summary with different lines still shows every one of them.
 */
export interface SummaryGroup {
  key: string;
  title: string;
  items: SummaryItem[];
}

const GROUPS: { key: string; title: string; labels: string[] }[] = [
  { key: "parties", title: "Parties and scope", labels: ["Who it is between"] },
  {
    key: "confidentiality",
    title: "Confidentiality",
    labels: ["What counts as confidential", "What does not"],
  },
  {
    key: "duration",
    title: "Duration and termination",
    labels: ["Term", "Termination", "After it ends"],
  },
  {
    key: "obligations",
    title: "Return of materials",
    labels: ["Returning materials"],
  },
  { key: "legal", title: "Liability and legal terms", labels: ["Liability", "Governing law"] },
  { key: "other", title: "Other terms", labels: ["Payment"] },
];

export const OTHER_TERMS_TITLE = "Other terms";

export function groupSummary(items: SummaryItem[]): SummaryGroup[] {
  const known = new Set(GROUPS.flatMap((g) => g.labels));
  const groups: SummaryGroup[] = GROUPS.map((g) => ({
    key: g.key,
    title: g.title,
    items: items.filter((item) => g.labels.includes(item.label)),
  }));
  // A label the list does not know goes in the same last section, after the ones it does.
  const other = groups.find((g) => g.key === "other");
  other?.items.push(...items.filter((item) => !known.has(item.label)));
  return groups.filter((g) => g.items.length > 0);
}
