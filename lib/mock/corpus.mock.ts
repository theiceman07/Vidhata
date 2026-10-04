/**
 * The citations the corpus can verify, by name only.
 *
 * Labels, not statute text: nothing here says what a section provides, and
 * nothing should. A citation is verified when it matches an entry here and
 * blocked when it does not. Add an entry by name when the corpus gains one.
 */
export interface CorpusEntry {
  /** The `corpusRef` a verified citation carries. */
  ref: string;
  /** The citation as it is written on a finding. */
  label: string;
}

export const CORPUS: CorpusEntry[] = [
  { ref: "ica-1872-s27", label: "Indian Contract Act, 1872, s.27" },
  { ref: "ica-1872-s28", label: "Indian Contract Act, 1872, s.28" },
  { ref: "ica-1872-s74", label: "Indian Contract Act, 1872, s.74" },
  {
    ref: "msmed-2006-s15",
    label: "Micro, Small and Medium Enterprises Development Act, 2006, s.15",
  },
  {
    ref: "msmed-2006-s16",
    label: "Micro, Small and Medium Enterprises Development Act, 2006, s.16",
  },
  { ref: "stamp-1899-s35", label: "Indian Stamp Act, 1899, s.35" },
  { ref: "registration-1908-s17", label: "Registration Act, 1908, s.17" },
];
