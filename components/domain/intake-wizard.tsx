"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
import { Icon } from "@/components/shared/icon";
import { DRAFT_STEPS_SLOT } from "@/components/domain/draft-paths";
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

  // What a draft needs, read from the form as it is filled, so the indicator
  // moves with the person and not only with the brief.
  const have: Record<string, boolean> = {
    type: Boolean(values.type),
    counterpartyName: Boolean(values.counterpartyName?.trim()),
    transactionValue: Number(values.transactionValue) > 0,
    durationMonths: Number(values.durationMonths) > 0,
    stateOfExecution: Boolean(values.stateOfExecution),
  };
  const ready = DRAFT_NEEDS.filter((key) => have[key as string]).length;
  const stillNeeded = DRAFT_NEEDS.length - ready;
  // "Ready to draft" is said only when the form itself would accept the draft:
  // the five facts can all be in while the deal name or governing law is not.
  const formComplete = intakeSchema.safeParse(values).success;
  const readinessText =
    stillNeeded > 0
      ? `${stillNeeded} to go`
      : formComplete
        ? "Ready to draft"
        : "Complete the form";

  // Steps after the first sit in one column, so the heading, the card and the
  // bar share their edges; the contract picker uses the full width.
  const columnWidth = step === 0 ? "max-w-[90rem]" : "max-w-4xl";

  const stepper = (
    <ol aria-label="Progress" className="flex w-full items-center lg:ml-auto lg:max-w-2xl">
      {STEP_LABELS.map((label, i) => (
        <li
          key={label}
          aria-current={i === step ? "step" : undefined}
          className={cn("flex items-center", i < STEP_LABELS.length - 1 && "flex-1")}
        >
          <span
            className={cn(
              "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-meta",
              i === step ? "bg-accent/10 font-medium text-ink" : "text-muted-fg",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label",
                i < step
                  ? "bg-accent text-accent-fg"
                  : i === step
                    ? "bg-accent text-accent-fg"
                    : "bg-paper text-muted-fg ring-1 ring-inset ring-line",
              )}
            >
              {i < step ? <Icon name="check" size={16} /> : i + 1}
            </span>
            <span className="whitespace-nowrap max-sm:sr-only">{label}</span>
            {i === step && <span className="sr-only sm:hidden">{label}</span>}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <span aria-hidden className="mx-3 h-px min-w-4 flex-1 bg-line" />
          )}
        </li>
      ))}
    </ol>
  );

  // Seated beside the mode control, once it has mounted; until then, and if
  // there is no slot, it lies above the form.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(DRAFT_STEPS_SLOT));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col">
      {slot ? createPortal(stepper, slot) : <div className="mb-6">{stepper}</div>}

      <form
        onSubmit={onFormSubmit}
        onKeyDown={onFormKeyDown}
        onChange={() => {
          touched.current = true;
        }}
        className="flex min-w-0 flex-1 flex-col"
      >
        <div className={cn("mx-auto w-full pb-8", columnWidth)}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h2 className="text-h3 text-ink">{STEP_LABELS[step]}</h2>
            {step === 0 && (
              <p className="mt-0.5 text-meta text-muted-fg">
                Choose what you are drafting. Types marked coming soon are not available yet.
              </p>
            )}
            {fromBrief && (
              <p className="mt-0.5 text-meta text-muted-fg">
                Your brief gave {fromBrief.found} of the {DRAFT_NEEDS.length} details a draft needs.
              </p>
            )}
          </div>
          {/* Readiness: how many of the details a draft needs are in. */}
          <div className="w-full shrink-0 sm:w-72" role="status">
            <p className="flex items-baseline justify-between gap-3 text-label text-muted-fg">
              <span>
                {ready} of {DRAFT_NEEDS.length} details a draft needs
              </span>
              <span className="whitespace-nowrap text-ink">{readinessText}</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] motion-reduce:transition-none"
                style={{ width: `${(ready / DRAFT_NEEDS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div
          className={cn(
            "space-y-5",
            step !== 0 &&
              "rounded-card border border-line bg-parchment p-5 sm:p-7 lg:p-8",
          )}
        >
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
                className="h-12"
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
            <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="clientName">Your company name</Label>
              <Input className="h-12" id="clientName" {...register("clientName")} />
              {errors.clientName && (
                <p className="mt-1 text-small text-flagged">
                  {errors.clientName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="counterpartyName">Counterparty name</Label>
              <Input className="h-12" id="counterpartyName" {...register("counterpartyName")} />
              {errors.counterpartyName && (
                <p className="mt-1 text-small text-flagged">
                  {errors.counterpartyName.message}
                </p>
              )}
            </div>
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
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="transactionValue">
                Transaction value (INR)
              </Label>
              <Input
                className="h-12"
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
                className="h-12"
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
                <SelectTrigger id="stateOfExecution" className="h-12">
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
                className="h-12"
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
          </div>
        )}

        {step === 3 && (
          <div>
            <Label htmlFor="keyTerms">Key terms (optional)</Label>
            <Textarea
              id="keyTerms"
              {...register("keyTerms")}
              placeholder="Anything specific the draft should account for?"
              rows={8}
              className="min-h-[12rem]"
            />
            <p className="mt-4 max-w-measure text-meta text-muted-fg">
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
        </div>
        </div>

        {/* A bar of its own, solid, in the flow after the fields, so the last
            row of options always clears it. mt-auto seats it at the end of
            the available height when the form is short; sticky keeps it in
            reach when the form is long. The page's bottom padding sits below
            where a sticky bar stops, so the ::after fills that strip, or
            tiles would show beneath it. */}
        <div className="sticky bottom-0 z-10 mt-auto border-t border-line bg-paper pt-0 after:absolute after:inset-x-0 after:top-full after:h-16 after:bg-paper">
        <div
          className={cn(
            "mx-auto flex min-h-[4.5rem] w-full items-center justify-between gap-3 py-4",
            columnWidth,
          )}
        >
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
            <Button key="continue" type="button" onClick={goNext} disabled={step === 0 && !values.type}>
              Continue
            </Button>
          ) : (
            <Button key="submit" type="submit" disabled={submitting}>
              {submitting ? "Drafting…" : "Draft the document"}
            </Button>
          )}
        </div>
        </div>
      </form>
    </div>
  );
}
