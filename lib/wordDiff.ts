export type WordPart = { text: string; kind: "same" | "removed" | "added" };

const tokens = (text: string) => text.split(/(\s+)/).filter((t) => t !== "");

/**
 * The words that differ between two texts, as the two sides of a comparison.
 *
 * `before` holds the earlier text with the words it lost marked "removed";
 * `after` holds the later text with the words it gained marked "added". Every
 * other word, and the spaces between, is "same", so each side reads in full
 * and in its own order. It compares words, not characters: "thirty six (36)"
 * becoming "twenty four (24)" marks the words that changed and not their
 * letters.
 */
export function wordDiff(before: string, after: string): { before: WordPart[]; after: WordPart[] } {
  const a = tokens(before);
  const b = tokens(after);

  // Longest common subsequence of tokens, filled from the end so it can be walked forward.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const left: WordPart[] = [];
  const right: WordPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      left.push({ text: a[i], kind: "same" });
      right.push({ text: b[j], kind: "same" });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      left.push({ text: a[i++], kind: "removed" });
    } else {
      right.push({ text: b[j++], kind: "added" });
    }
  }
  while (i < a.length) left.push({ text: a[i++], kind: "removed" });
  while (j < b.length) right.push({ text: b[j++], kind: "added" });
  return { before: left, after: right };
}
