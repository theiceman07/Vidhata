import type { ContractDocument, ReviewTier } from "@/lib/types";
import { CONTRACT_TYPES, INDIAN_STATES } from "@/lib/mock/intake-options.mock";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { IntakeInput } from "./documents";
import { randomDelay } from "./delay";

/**
 * Reading a brief into intake terms.
 *
 * The client describes the deal in a sentence. The real agent reads that
 * into the facts intake needs; until it lands, this mock reads only what
 * the brief plainly states and assumes nothing else. A fact the brief does
 * not state is reported missing, never guessed: the tier in particular is
 * the client's choice (QA 3.2), and the state of execution decides stamp
 * duty. The one default is governing law, the laws of India unless the
 * brief names another, because Vidhata settles Indian contracts; it is
 * shown in intake and on the document.
 */
export interface BriefReading {
  /** Intake facts the brief states. */
  found: Partial<IntakeInput>;
  /** Facts a draft needs that the brief does not state, in intake order. */
  missing: (keyof IntakeInput)[];
}

/** What a draft cannot be started without. */
export const DRAFT_NEEDS: (keyof IntakeInput)[] = [
  "type",
  "tier",
  "counterpartyName",
  "transactionValue",
  "durationMonths",
  "stateOfExecution",
];

const TYPE_PATTERNS: [ContractDocument["type"], RegExp][] = [
  ["nda", /\bnda\b|non[- ]?disclosure|confidentiality agreement/i],
  ["msa", /\bmsa\b|master services|services agreement|consult(?:ing|ancy)/i],
  ["employment", /employ|\bhir(?:e|ing)\b|offer letter|appointment letter/i],
  ["vendor", /vendor|supplier|supply|purchase|procure/i],
];

const TIER_PATTERNS: [ReviewTier, RegExp][] = [
  ["senior", /senior review|senior advocate|senior tier/i],
  ["enhanced", /enhanced/i],
  ["standard", /standard review|standard tier/i],
];

// Cities people name in place of the state they sit in. Geography only.
const CITY_STATE: Record<string, (typeof INDIAN_STATES)[number]> = {
  "new delhi": "Delhi",
  mumbai: "Maharashtra",
  pune: "Maharashtra",
  bengaluru: "Karnataka",
  bangalore: "Karnataka",
  chennai: "Tamil Nadu",
  coimbatore: "Tamil Nadu",
  hyderabad: "Telangana",
  ahmedabad: "Gujarat",
  surat: "Gujarat",
  kolkata: "West Bengal",
  gurugram: "Haryana",
  gurgaon: "Haryana",
  noida: "Uttar Pradesh",
  lucknow: "Uttar Pradesh",
  kochi: "Kerala",
  thiruvananthapuram: "Kerala",
};

const UNIT: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  crore: 10_000_000,
  crores: 10_000_000,
  cr: 10_000_000,
};

function readValue(brief: string): number | undefined {
  const match =
    brief.match(/(?:₹|\brs\.?|\binr)\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakhs?|lac|crores?|cr)?\b/i) ??
    brief.match(/\b([\d,]+(?:\.\d+)?)\s*(lakhs?|lac|crores?|cr)\b/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return undefined;
  const unit = match[2] ? UNIT[match[2].toLowerCase()] : 1;
  return Math.round(amount * unit);
}

function readDuration(brief: string): number | undefined {
  const months = brief.match(/\b(\d{1,3})\s*(?:-\s*)?(?:months?|mo)\b/i);
  if (months) return Number(months[1]);
  const years = brief.match(/\b(\d{1,2})\s*(?:-\s*)?(?:years?|yrs?)\b/i);
  if (years) return Number(years[1]) * 12;
  return undefined;
}

function readState(brief: string): string | undefined {
  const lower = brief.toLowerCase();
  const state = INDIAN_STATES.find((s) => lower.includes(s.toLowerCase()));
  if (state) return state;
  const city = Object.keys(CITY_STATE).find((c) => new RegExp(`\\b${c}\\b`).test(lower));
  return city ? CITY_STATE[city] : undefined;
}

// A name after "with": the run of capitalised words that follows it.
function readCounterparty(brief: string): string | undefined {
  const match = brief.match(
    /\bwith\s+((?:[A-Z0-9][\w&.'-]*)(?:\s+(?:[A-Z0-9][\w&.'-]*|&|and|of))*)/,
  );
  if (!match) return undefined;
  const name = match[1].replace(/\s+(?:and|of|&)$/i, "").trim();
  return name.length >= 2 ? name : undefined;
}

export async function readBrief(brief: string): Promise<BriefReading> {
  await randomDelay(150, 300);
  const text = brief.trim();
  const found: Partial<IntakeInput> = {
    clientName: MOCK_CLIENT_ORG.name,
    keyTerms: text,
  };

  const type = TYPE_PATTERNS.find(([, re]) => re.test(text))?.[0];
  if (type) found.type = type;
  const tier = TIER_PATTERNS.find(([, re]) => re.test(text))?.[0];
  if (tier) found.tier = tier;
  const counterparty = readCounterparty(text);
  if (counterparty) found.counterpartyName = counterparty;
  const value = readValue(text);
  if (value !== undefined) found.transactionValue = value;
  const duration = readDuration(text);
  if (duration) found.durationMonths = duration;
  const state = readState(text);
  if (state) found.stateOfExecution = state;
  if (/\bmsme\b|udyam/i.test(text)) found.counterpartyIsMsme = true;
  const law = text.match(/\blaws? of ([A-Z][\w ]+?)(?:[.,;]|$)/);
  found.governingLaw = law ? `laws of ${law[1].trim()}` : "laws of India";

  if (found.type) {
    const label = CONTRACT_TYPES.find((t) => t.value === found.type)?.label;
    found.title = counterparty ? `${label} · ${counterparty}` : label;
  }

  return { found, missing: DRAFT_NEEDS.filter((key) => found[key] === undefined) };
}

/** A reading complete enough to draft from, as a full intake. */
export function intakeFromReading(reading: BriefReading): IntakeInput | null {
  if (reading.missing.length > 0) return null;
  const f = reading.found;
  return {
    title: f.title ?? "Untitled",
    type: f.type!,
    tier: f.tier!,
    clientName: f.clientName ?? MOCK_CLIENT_ORG.name,
    counterpartyName: f.counterpartyName!,
    stateOfExecution: f.stateOfExecution!,
    transactionValue: f.transactionValue!,
    counterpartyIsMsme: f.counterpartyIsMsme ?? false,
    durationMonths: f.durationMonths!,
    governingLaw: f.governingLaw ?? "laws of India",
    keyTerms: f.keyTerms ?? "",
  };
}
