/**
 * The next finding number: one more than the highest already used, padded to
 * two digits ("04"). Pass every number the document has ever used, in any
 * draft, so a finding that has since gone keeps its place and its number is
 * never given to another.
 */
export function nextNumber(used: Iterable<string>): string {
  let highest = 0;
  for (const number of used) {
    const value = Number.parseInt(number, 10);
    if (Number.isFinite(value) && value > highest) highest = value;
  }
  return String(highest + 1).padStart(2, "0");
}
