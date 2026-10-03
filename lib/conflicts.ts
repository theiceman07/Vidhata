/**
 * Whether a name an advocate has declared a conflict with is one of the
 * parties to a document.
 *
 * A declared conflict is a name the advocate typed on their profile, so it
 * is compared by whole words, never by guessing: "Kavach" matches "Kavach
 * Robotics Pvt Ltd" because every word of it is a word of the party's name,
 * and "Kav" matches nothing. Company suffixes and the "Individual" label are
 * not part of a name. When in doubt the advocate is stopped and told which
 * name matched, so they can decide and correct their profile.
 *
 * A stand-in. The conflict checks the requirements call for (SRD 4.2) are at
 * the level of parties and matters, which needs real party and matter data
 * this preview does not have. This compares names the advocate typed, and
 * nothing here should be mistaken for that check.
 */

const NOISE = new Set([
  "individual",
  "pvt",
  "private",
  "ltd",
  "limited",
  "llp",
  "inc",
  "co",
  "the",
]);

function words(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !NOISE.has(w));
}

/** The first declared name that names one of these parties, with that party. */
export function declaredConflictWith(
  parties: string[],
  declared: string[],
): { declared: string; party: string } | null {
  for (const name of declared) {
    const wanted = words(name);
    if (wanted.length === 0) continue;
    for (const party of parties) {
      const have = new Set(words(party));
      if (wanted.every((w) => have.has(w))) return { declared: name, party };
    }
  }
  return null;
}
