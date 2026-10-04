import { CONSULTATION, TIER_PRICING } from "@/lib/config/pricing";
import { CORPUS } from "@/lib/mock/corpus.mock";
import { accountSeed } from "@/lib/mock/account.mock";
import { advocateProfileSeed } from "@/lib/mock/advocate.mock";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { mockVersions } from "@/lib/mock/versions.mock";
import type {
  Account,
  AdvocateNote,
  BillingProfile,
  Consultation,
  ContractDocument,
  DocumentVersion,
  PrivacyState,
} from "@/lib/types";
import type { AdvocateProfile } from "./advocate";
import type { CitationAttempt } from "./citations";

/**
 * The preview's data, kept for the life of one browser tab.
 *
 * Every mock store lives in memory, so a refresh used to wipe the demo. They
 * are now written to sessionStorage and read back when the page loads, so a
 * refresh keeps them. sessionStorage, not localStorage: it dies with the tab,
 * so a stale demo cannot survive for days, and two tabs never share it.
 *
 * Three things keep it honest:
 *
 * - A version. The stored state carries SCHEMA_VERSION (bump it when a shape
 *   changes) and a fingerprint of the fixtures it grew from, so a change to a
 *   fixture, the corpus or a price throws the old state away on its own. A
 *   mismatch discards everything, never a part: the slices refer to one
 *   another (a consultation to a document), and half a restore is worse than
 *   none.
 * - A value that cannot be read, or is not the shape it should be, is
 *   discarded and the fixtures are used. It never crashes the page.
 * - Everything stored is JSON, so a time is an ISO string and stays one. A
 *   Date in a store would come back as a string and quietly change type, so
 *   the stores hold none (lib/api/state.test.ts holds that).
 *
 * The consultation question and answer are in what is stored. That is fine for
 * a mock held in one tab. A real backend keeps them out of anything the client
 * can store (docs/api-contract.md, section 9).
 */

export const SCHEMA_VERSION = 2;
const STORAGE_KEY = "vidhata-preview-state";

/** Every slice, in the shape it is stored. Maps and sets are stored as lists. */
export interface DemoState {
  documents: ContractDocument[];
  versions: DocumentVersion[];
  consultations: Consultation[];
  citationAttempts: CitationAttempt[];
  privacy: [string, PrivacyState][];
  billing: [string, BillingProfile][];
  account: [string, Account][];
  advocate: AdvocateProfile;
  invitationsUsed: string[];
  notes: AdvocateNote[];
}
type Slice = keyof DemoState;

// 32-bit FNV-1a: small, and enough to tell one set of fixtures from another.
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

let fingerprintCache: string | null = null;

/** What the stored state was built from. A change to any of it discards the state. */
export function fingerprint(): string {
  fingerprintCache ??= hash(
    JSON.stringify([mockDocuments, mockVersions, advocateProfileSeed, accountSeed, CORPUS, TIER_PRICING, CONSULTATION]),
  );
  return `${SCHEMA_VERSION}:${fingerprintCache}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const listOf = (check: (item: unknown) => boolean) => (v: unknown) =>
  Array.isArray(v) && v.every(check);
const pairOf = (v: unknown) => Array.isArray(v) && typeof v[0] === "string" && isRecord(v[1]);

// A light check, not a schema: enough to refuse a value that is plainly not
// what was stored, so a hand-edited or half-written one cannot crash a screen.
const SHAPES: Record<Slice, (v: unknown) => boolean> = {
  documents: listOf((d) => isRecord(d) && typeof d.id === "string" && typeof d.status === "string" && Array.isArray(d.findings) && Array.isArray(d.clauses)),
  versions: listOf((v) => isRecord(v) && typeof v.documentId === "string" && typeof v.number === "number"),
  consultations: listOf((c) => isRecord(c) && typeof c.id === "string" && typeof c.status === "string"),
  citationAttempts: listOf((a) => isRecord(a) && typeof a.id === "string" && typeof a.outcome === "string"),
  privacy: listOf(pairOf),
  billing: listOf(pairOf),
  account: listOf(pairOf),
  advocate: (v) => isRecord(v) && Array.isArray(v.declaredConflicts),
  invitationsUsed: listOf((t) => typeof t === "string"),
  notes: listOf((n) => isRecord(n) && typeof n.id === "string"),
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function readStored(): DemoState | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  const discard = (): null => {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      // Nothing more to do: the fixtures are used either way.
    }
    return null;
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return discard();
  }
  if (!isRecord(parsed) || parsed.fingerprint !== fingerprint() || !isRecord(parsed.slices)) {
    return discard();
  }
  for (const slice of Object.keys(SHAPES) as Slice[]) {
    if (!SHAPES[slice](parsed.slices[slice])) return discard();
  }
  return parsed.slices as unknown as DemoState;
}

/** What each slice is on a fresh start: the fixtures, or nothing yet. */
const SEEDS: { [K in Slice]: () => DemoState[K] } = {
  documents: () => structuredClone(mockDocuments),
  versions: () => structuredClone(mockVersions),
  consultations: () => [],
  citationAttempts: () => [],
  privacy: () => [],
  billing: () => [],
  account: () => structuredClone(accountSeed),
  advocate: () => structuredClone(advocateProfileSeed),
  invitationsUsed: () => [],
  notes: () => [],
};

/**
 * The stored slice if there is a good one, else the fixtures. Each store calls
 * this once, when its module loads.
 */
export function restored<K extends Slice>(slice: K): DemoState[K] {
  const state = readStored();
  return state ? state[slice] : SEEDS[slice]();
}

const getters: { [K in Slice]?: () => DemoState[K] } = {};

/** How a store hands over what it holds, to be saved. */
export function register<K extends Slice>(slice: K, get: () => DemoState[K]): void {
  getters[slice] = get as never;
}

/**
 * Everything, as it would be stored. A store's module loads when a screen first
 * needs it, so on a given page some have not loaded. Their slice is whatever is
 * stored already, or the fixtures: never left out, because a partial state is
 * thrown away as a mismatch, and never reset, because it may hold earlier work.
 */
export function snapshot(): DemoState {
  const stored = readStored();
  const state: Partial<DemoState> = {};
  for (const slice of Object.keys(SHAPES) as Slice[]) {
    const get = getters[slice];
    (state as Record<Slice, unknown>)[slice] = get ? get() : (stored?.[slice] ?? SEEDS[slice]());
  }
  return state as DemoState;
}

let resetting = false;

export function saveNow(): void {
  const store = storage();
  if (!store || resetting) return;
  try {
    store.setItem(
      STORAGE_KEY,
      JSON.stringify({ fingerprint: fingerprint(), savedAt: new Date().toISOString(), slices: snapshot() }),
    );
  } catch {
    // Storage full or blocked: the demo carries on in memory, as it did before.
  }
}

let scheduled = false;

/**
 * Save once the current turn is done. The mock layer calls this each time one
 * of its waits ends, so what an API function changes after its wait is saved
 * straight after it returns, without every function having to remember to.
 */
export function scheduleSave(): void {
  if (scheduled || !storage()) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    saveNow();
  }, 0);
}

if (typeof window !== "undefined") {
  // A refresh, a close, or a switch away: save what is there.
  window.addEventListener?.("pagehide", saveNow);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveNow();
    });
  }
}

/** Forget everything and start again from the fixtures. */
export function resetDemoData(): void {
  resetting = true;
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // The reload below starts from the fixtures if the key cannot be removed.
  }
  window.location.reload();
}
