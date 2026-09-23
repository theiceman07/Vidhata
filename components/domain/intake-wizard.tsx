"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDraftDocument } from "@/lib/api/documents";
import { DRAFT_NEEDS, readBrief } from "@/lib/api/brief";
import { BRIEF_KEY } from "@/components/marketing/deal-prompt";
import { CONTRACT_TYPES, INDIAN_STATES } from "@/lib/mock/intake-options.mock";
import { cn } from "@/lib/utils";

const intakeSchema = z.object({
  title: z.string().min(3, "Give this deal a short name."),
  type: z.enum(["nda", "vendor", "msa", "employment"], {
    required_error: "Choose a contract type.",
  }),
  // QA 3.2: the wizard never asked for a tier — every deal was silently
  // created as "standard" then force-upgraded to "enhanced" once analysis
  // finished, so "Senior review" (advertised on /pricing) was unreachable.
  tier: z.enum(["standard", "enhanced", "senior"], {
    required_error: "Choose a review tier.",
  }),
  clientName: z.string().min(2, "Enter your company name."),
  counterpartyName: z.string().min(2, "Enter the counterparty's name."),
  counterpartyIsMsme: z.boolean(),
  transactionValue: z.coerce
    .number()
    .min(0, "Transaction value cannot be negative."),
  durationMonths: z.coerce.number().min(1, "Enter the contract duration."),
  stateOfExecution: z.string().min(1, "Choose the state of execution."),
  governingLaw: z.string().min(2, "Enter the governing law."),
  keyTerms: z.string().optional(),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

const STEP_FIELDS: (keyof IntakeFormValues)[][] = [
  [
    "title",
    "type",
    "tier",
    "clientName",
    "counterpartyName",
    "counterpartyIsMsme",
  ],
  [
    "transactionValue",
    "durationMonths",
    "stateOfExecution",
    "governingLaw",
  ],
  ["keyTerms"],
];

const STEP_LABELS = ["Deal basics", "Transaction details", "Key terms"];

const TIER_OPTIONS: { value: IntakeFormValues["tier"]; label: string; price: string }[] = [
  { value: "standard", label: "Standard", price: "₹4,999" },
  { value: "enhanced", label: "Enhanced", price: "₹12,999" },
  { value: "senior", label: "Senior review", price: "₹24,999" },
];

export function IntakeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // How far the brief got: facts a draft needs that it stated, and not.
  const [fromBrief, setFromBrief] = useState<{ found: number; missing: number } | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      title: "",
      type: "nda",
      tier: "standard",
      clientName: "",
      counterpartyName: "",
      counterpartyIsMsme: false,
      transactionValue: 0,
      durationMonths: 12,
      stateOfExecution: "",
      governingLaw: "",
      keyTerms: "",
    },
  });

  // A brief that did not state everything a draft needs arrives here.
  // What it did state is filled in, the brief itself becomes the key
  // terms, and intake opens at the first step with something missing.
  useEffect(() => {
    let brief: string | null = null;
    try {
      brief = window.sessionStorage.getItem(BRIEF_KEY);
    } catch {
      // Storage unavailable: nothing to carry over.
    }
    if (!brief) return;

    // The brief is cleared only once it has been applied, so an effect
    // that is torn down before its reading lands (StrictMode runs every
    // effect twice in development) leaves it for the next run.
    let cancelled = false;
    readBrief(brief).then(({ found, missing }) => {
      if (cancelled) return;
      try {
        window.sessionStorage.removeItem(BRIEF_KEY);
      } catch {
        // Nothing to clear.
      }
      for (const [key, value] of Object.entries(found)) {
        if (value !== undefined) setValue(key as keyof IntakeFormValues, value as never);
      }
      const first = STEP_FIELDS.findIndex((fields) =>
        fields.some((f) => missing.includes(f as (typeof missing)[number])),
      );
      setStep(first === -1 ? STEP_LABELS.length - 1 : first);
      setFromBrief({ found: DRAFT_NEEDS.length - missing.length, missing: missing.length });
    });
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const values = watch();

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const doc = await createDraftDocument({
        title: data.title,
        type: data.type,
        tier: data.tier,
        clientName: data.clientName,
        counterpartyName: data.counterpartyName,
        stateOfExecution: data.stateOfExecution,
        transactionValue: data.transactionValue,
        counterpartyIsMsme: data.counterpartyIsMsme,
        durationMonths: data.durationMonths,
        governingLaw: data.governingLaw,
        keyTerms: data.keyTerms ?? "",
      });
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not create the draft.",
      );
      setSubmitting(false);
    }
  });

  return (
    <div className="grid max-w-5xl gap-x-16 gap-y-8 md:grid-cols-[minmax(0,14rem)_minmax(0,32rem)]">
      {/* The steps are a schedule down the margin, not a row of numbered
          discs: the same notation the rest of the product uses to say
          where you are. */}
      <ol className="space-y-3 md:sticky md:top-10 md:self-start">
        {STEP_LABELS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "flex items-baseline gap-3 border-l-2 py-1 pl-4",
              i === step
                ? "border-ink"
                : i < step
                  ? "border-verified"
                  : "border-line",
            )}
          >
            <span className="font-mono text-notation tracking-notation text-muted-fg">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "text-meta",
                i === step ? "font-medium text-ink" : "text-muted-fg",
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="space-y-5">
        {fromBrief && (
          <p className="rounded-control bg-parchment px-4 py-3 text-meta text-ink">
            Your brief gave {fromBrief.found} of the {DRAFT_NEEDS.length} details a draft needs.
            {fromBrief.missing > 0
              ? ` ${fromBrief.missing === 1 ? "One more is" : `${fromBrief.missing} more are`} needed before the draft can start.`
              : " Check them, then draft."}
          </p>
        )}
        {step === 0 && (
          <>
            <div>
              <Label htmlFor="title">Deal name</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Vendor agreement · packaging supply"
              />
              {errors.title && (
                <p className="mt-1 text-small text-flagged">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="type">Contract type</Label>
              <Select
                value={values.type}
                onValueChange={(v) =>
                  setValue("type", v as IntakeFormValues["type"])
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="clientName">Your company name</Label>
              <Input id="clientName" {...register("clientName")} />
              {errors.clientName && (
                <p className="mt-1 text-small text-flagged">
                  {errors.clientName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="counterpartyName">Counterparty name</Label>
              <Input id="counterpartyName" {...register("counterpartyName")} />
              {errors.counterpartyName && (
                <p className="mt-1 text-small text-flagged">
                  {errors.counterpartyName.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="counterpartyIsMsme"
                checked={values.counterpartyIsMsme}
                onCheckedChange={(v) =>
                  setValue("counterpartyIsMsme", v === true)
                }
              />
              <Label htmlFor="counterpartyIsMsme" className="font-normal">
                The counterparty is a registered MSME
              </Label>
            </div>
            <div>
              <Label htmlFor="tier">Review tier</Label>
              <Select
                value={values.tier}
                onValueChange={(v) =>
                  setValue("tier", v as IntakeFormValues["tier"])
                }
              >
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} · {t.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* QA 3.2: billing is not enabled in this preview — no
                  payment is taken for any tier. */}
              <p className="mt-1 text-small text-muted-fg">
                Billing is not enabled in this preview. No payment is taken.
              </p>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <Label htmlFor="transactionValue">
                Transaction value (INR)
              </Label>
              <Input
                id="transactionValue"
                type="number"
                {...register("transactionValue")}
              />
              {errors.transactionValue && (
                <p className="mt-1 text-small text-flagged">
                  {errors.transactionValue.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="durationMonths">Duration (months)</Label>
              <Input
                id="durationMonths"
                type="number"
                {...register("durationMonths")}
              />
              {errors.durationMonths && (
                <p className="mt-1 text-small text-flagged">
                  {errors.durationMonths.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="stateOfExecution">State of execution</Label>
              <Select
                value={values.stateOfExecution}
                onValueChange={(v) => setValue("stateOfExecution", v)}
              >
                <SelectTrigger id="stateOfExecution">
                  <SelectValue placeholder="Choose a state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.stateOfExecution && (
                <p className="mt-1 text-small text-flagged">
                  {errors.stateOfExecution.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="governingLaw">Governing law</Label>
              <Input
                id="governingLaw"
                {...register("governingLaw")}
                placeholder="Laws of India"
              />
              {errors.governingLaw && (
                <p className="mt-1 text-small text-flagged">
                  {errors.governingLaw.message}
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <div>
            <Label htmlFor="keyTerms">Key terms (optional)</Label>
            <Textarea
              id="keyTerms"
              {...register("keyTerms")}
              placeholder="Anything specific the draft should account for?"
              rows={6}
            />
          </div>
        )}

        {submitError && (
          <p className="text-small text-flagged">{submitError}</p>
        )}

        <div className="flex justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < STEP_LABELS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? "Drafting…" : "Draft the document"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
