import type { ContractDocument } from "@/lib/types";

/**
 * The catalogue of contract types, in the groups it is published in.
 *
 * One flag per type decides whether a draft can start: `available`. Flip it
 * and the picker follows, with no code change. An available type names the
 * kind of document the drafter produces (`draftType`) and what a drafted
 * document is called (`draftLabel`). A type that is not available is shown,
 * disabled, as "Coming soon".
 *
 * The names are the source list's own. Its group boundaries were read from
 * the order of the entries (4, 4, 4, 4, 3 under the five headings), not from
 * an explicit marker, so confirm them against the original document.
 */
export type ContractGroupId =
  | "commercial"
  | "corporate"
  | "hr"
  | "financial"
  | "real_estate";

export interface ContractGroup {
  id: ContractGroupId;
  label: string;
}

export const CONTRACT_GROUPS: ContractGroup[] = [
  { id: "commercial", label: "Commercial and sales" },
  { id: "corporate", label: "Corporate and confidentiality" },
  { id: "hr", label: "HR and employment" },
  { id: "financial", label: "Financial and investment" },
  { id: "real_estate", label: "Real estate and leases" },
];

interface ContractTypeBase {
  id: string;
  /** As the source list names it. */
  label: string;
  group: ContractGroupId;
}

export type ContractTypeOption =
  | (ContractTypeBase & {
      available: true;
      draftType: ContractDocument["type"];
      draftLabel: string;
    })
  | (ContractTypeBase & { available: false });

export const CONTRACT_CATALOGUE: ContractTypeOption[] = [
  // Commercial and sales
  {
    id: "vendor",
    label: "Vendor / Supplier Agreement",
    group: "commercial",
    available: true,
    draftType: "vendor",
    draftLabel: "Vendor agreement",
  },
  {
    id: "sla",
    label: "Service Level Agreement (SLA)",
    group: "commercial",
    available: false,
  },
  {
    id: "msa",
    label: "Master Services Agreement (MSA)",
    group: "commercial",
    available: true,
    draftType: "msa",
    draftLabel: "Master Services Agreement",
  },
  {
    id: "distributor",
    label: "Distributor / Dealership Agreement",
    group: "commercial",
    available: false,
  },

  // Corporate and confidentiality
  {
    id: "nda",
    label: "Non-Disclosure Agreement (NDA)",
    group: "corporate",
    available: true,
    draftType: "nda",
    draftLabel: "NDA",
  },
  {
    id: "cofounder",
    label: "Co-Founder / Founders' Agreement",
    group: "corporate",
    available: false,
  },
  { id: "partnership", label: "Partnership Deed", group: "corporate", available: false },
  {
    id: "joint-venture",
    label: "Joint Venture Agreement (JVA)",
    group: "corporate",
    available: false,
  },

  // HR and employment
  {
    id: "employment",
    label: "Employment Contract / Appointment Letter",
    group: "hr",
    available: true,
    draftType: "employment",
    draftLabel: "Employment agreement",
  },
  {
    id: "consultant",
    label: "Independent Consultant / Freelancer Agreement",
    group: "hr",
    available: false,
  },
  {
    id: "non-compete",
    label: "Non-Compete & Non-Solicitation Agreement",
    group: "hr",
    available: false,
  },
  {
    id: "esop",
    label: "Employee Stock Option Plan (ESOP) Agreement",
    group: "hr",
    available: false,
  },

  // Financial and investment
  {
    id: "shareholders",
    label: "Shareholders' Agreement (SHA)",
    group: "financial",
    available: false,
  },
  {
    id: "term-sheet",
    label: "Term Sheet / Investment Agreement",
    group: "financial",
    available: false,
  },
  {
    id: "loan",
    label: "Loan / Debt Agreement",
    group: "financial",
    available: false,
  },
  {
    id: "hypothecation",
    label: "Inter-creditor / Hypothecation Agreement",
    group: "financial",
    available: false,
  },

  // Real estate and leases
  {
    id: "commercial-lease",
    label: "Commercial Lease / Rental Agreement",
    group: "real_estate",
    available: false,
  },
  {
    id: "leave-licence",
    label: "Leave and License Agreement",
    group: "real_estate",
    available: false,
  },
  {
    id: "equipment-lease",
    label: "Equipment Lease Agreement",
    group: "real_estate",
    available: false,
  },
];

/**
 * The types a draft can start from, under the names a drafted document
 * carries. Derived from the catalogue so the flag stays the only switch.
 */
export const CONTRACT_TYPES = CONTRACT_CATALOGUE.flatMap((entry) =>
  entry.available ? [{ value: entry.draftType, label: entry.draftLabel }] : [],
);

export const INDIAN_STATES = [
  "Delhi",
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Gujarat",
  "West Bengal",
  "Haryana",
  "Uttar Pradesh",
  "Kerala",
] as const;
