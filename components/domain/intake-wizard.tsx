"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { createClientDraft } from "@/lib/api/client/documents";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { DRAFT_NEEDS, readBrief } from "@/lib/api/brief";
import { BRIEF_KEY } from "@/components/marketing/deal-prompt";
import { ContractTypePicker } from "@/components/domain/contract-type-picker";
import {
  PRICE_BASIS,
  PRICING_IS_INDICATIVE,
  rupees,
  tierRange,
} from "@/lib/config/pricing";
import { intakeSchema, type IntakeFormValues } from "@/lib/intakeSchema";
import { INDIAN_STATES } from "@/lib/mock/intake-options.mock";
import { createReentryGuard, runExclusive } from "@/lib/reentry";
import { cn } from "@/lib/utils";


const STEP_FIELDS: (keyof IntakeFormValues)[][] = [
  ["type"],
  ["title", "clientName", "counterpartyName", "counterpartyIsMsme"],
  [
    "transactionValue",
    "durationMonths",
    "stateOfExecution",
    "governingLaw",
  ],
  ["keyTerms"],
];

const STEP_LABELS = ["Contract type", "Deal basics", "Transaction details", "Key terms"];

export function IntakeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // How far the brief got: facts a draft needs that it stated, and not.
  const [fromBrief, setFromBrief] = useState<{ found: number; missing: number } | null>(null);
  // Set the moment the person does anything: picks a type, types, moves a step.
  // The brief is read after a wait, and when the reading lands it must not undo
  // what they have already done (it used to put them back on step one and
  // overwrite what they had typed).
  const touched = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      title: "",
      // No default type: the client chooses it, and a brief that states it
      // fills it in. Nothing unstated is guessed.
      clientName: "",
      counterpartyName: "",
      counterpartyIsMsme: false,
      transactionValue: 0,
      durationMonths: 12,
      stateOfExecution: "",
      // The one default: Vidhata settles Indian contracts, so unless a brief
      // names another law this is the law, shown in the field and on the
      // document. It used to be empty with the words only as a placeholder, so
      // the field looked filled in and Continue refused it.
      governingLaw: "Laws of India",
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
      // A reading that lands after the person has begun only fills what they
      // have not: it never overwrites a choice or a value, and never moves them.
      const current = getValues();
      const empty = (v: unknown) => v === undefined || v === "";
      for (const [key, value] of Object.entries(found)) {
        if (value === undefined) continue;
        if (touched.current && !empty(current[key as keyof IntakeFormValues])) continue;
        setValue(key as keyof IntakeFormValues, value as never);
      }
      if (touched.current) return;
      const first = STEP_FIELDS.findIndex((fields) =>
        fields.some((f) => missing.includes(f as (typeof missing)[number])),
      );
      setStep(first === -1 ? STEP_LABELS.length - 1 : first);
      setFromBrief({ found: DRAFT_NEEDS.length - missing.length, missing: missing.length });
    });
    return () => {
      cancelled = true;
    };
  }, [setValue, getValues]);

  const values = watch();

  async function goNext() {
    touched.current = true;
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    touched.current = true;
    setStep((s) => Math.max(s - 1, 0));
  }

  // One draft per press. The button is disabled by `submitting`, which is state, and two presses
  // in the same tick both read it as false, so the guard is a ref: the second is dropped.
  const entry = useRef(createReentryGuard());

  const onSubmit = handleSubmit((data) =>
    runExclusive(entry.current, async () => {
      setSubmitting(true);
      setSubmitError("");
      try {
        const doc = await createClientDraft(MOCK_CLIENT_ORG.id, {
          title: data.title,
          type: data.type,
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
    }),
  );

  const isLastStep = step === STEP_LABELS.length - 1;

  // The draft is created only from the last step. A submit that arrives
  // earlier (requestSubmit, a browser quirk) reads as Continue: it validates
  // the step's own fields and moves on, never creates a document.
  function onFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isLastStep) {
      e.preventDefault();
      void goNext();
      return;
    }
    void onSubmit(e);
  }

  // Steps before the last have no submit button, so browsers do nothing on
  // Enter. People expect it to mean Continue. A textarea keeps Enter for new
  // lines, and a select or checkbox is not an input, so both are left alone.
  function onFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || isLastStep) return;
    if (!(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    void goNext();
  }

  return (
    <div
      className={cn(
        "grid max-w-5xl gap-y-8 xl:gap-x-16",
        // The picker lists the whole catalogue, so its step gets more room.
        step === 0
          ? "xl:grid-cols-[minmax(0,14rem)_minmax(0,44rem)]"
          : "xl:grid-cols-[minmax(0,14rem)_minmax(0,32rem)]",
      )}
    >
      {/* The steps are a schedule down the margin, not a row of numbered
          discs: the same notation the rest of the product uses to say
          where you are. */}
      {/* Below a wide screen the steps lie in a row above the form, so the form
          keeps the width the page has. */}
      <ol className="flex flex-wrap gap-x-6 gap-y-2 xl:block xl:space-y-3 xl:sticky xl:top-10 xl:self-start">
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

      <form
        onSubmit={onFormSubmit}
        onKeyDown={onFormKeyDown}
        onChange={() => {
          touched.current = true;
        }}
        className="space-y-5"
      >
        {fromBrief && (
          <p className="rounded-control bg-parchment px-4 py-3 text-meta text-ink">
            Your brief gave {fromBrief.found} of the {DRAFT_NEEDS.length} details a draft needs.
            {fromBrief.missing > 0
              ? ` ${fromBrief.missing === 1 ? "One more is" : `${fromBrief.missing} more are`} needed before the draft can start.`
              : " Check them, then draft."}
          </p>
        )}
        {step === 0 && (
          <ContractTypePicker
            value={values.type}
            onChange={(type) => {
              touched.current = true;
              setValue("type", type, { shouldValidate: true });
            }}
            error={errors.type?.message}
          />
        )}

        {step === 1 && (
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
            {/* The tier is not asked for: screening assigns it from the deal
                facts once the first pass has run. */}
            <p className="text-small text-muted-fg">
              Your review tier is assigned after screening, from the value and
              risk of the deal. Billing is not enabled in this preview. No
              payment is taken.
            </p>
          </>
        )}

        {step === 2 && (
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

        {step === 3 && (
          <div>
            <Label htmlFor="keyTerms">Key terms (optional)</Label>
            <Textarea
              id="keyTerms"
              {...register("keyTerms")}
              placeholder="Anything specific the draft should account for?"
              rows={6}
            />
            <p className="mt-5 max-w-measure rounded-card bg-parchment p-4 text-meta text-ink">
              One fixed fee per document, set by the review tier screening assigns after the
              first pass: from {rupees(tierRange().low)} to {rupees(tierRange().high)}{" "}
              {PRICE_BASIS}
              {PRICING_IS_INDICATIVE && " (indicative)"}. You pay once the document is screened,
              and nothing reaches an advocate before then.
            </p>
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
          {/* Different keys, so the Continue button is never the same DOM
              node as the submit button: validation resolves inside the
              click, and a button that turns into type="submit" mid-click
              submits the form. */}
          {!isLastStep ? (
            <Button key="continue" type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button key="submit" type="submit" disabled={submitting}>
              {submitting ? "Drafting…" : "Draft the document"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
