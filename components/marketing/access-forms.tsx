"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import {
  LIMITS,
  isEmail,
  submitAccessRequest,
  takeProviderPrefill,
  type ProviderPrefill,
} from "@/lib/api/access-requests";
import { INDIAN_STATES } from "@/lib/mock/intake-options.mock";
import type { AccessRequestInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BRIEF_KEY } from "./deal-prompt";

/**
 * The public site's three requests: access for a client, an application to the advocate panel,
 * and interest in an agreement that is not available yet. Each is one insert (lib/api/
 * access-requests.ts) and nothing is read back.
 *
 * Every field says why it is wrong, next to it, and the first wrong field takes focus. A hidden
 * field catches form-filling bots: a filled one is thanked and dropped.
 */

type Errors = Record<string, string>;

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted-fg">optional</span>}
      </Label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-meta text-muted-fg">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-small text-ink">
          <Icon name="error" size={16} className="text-blocked" />
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: boolean) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

/** The hidden bot trap. Not reachable by keyboard or screen reader. */
function Trap({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

function useSubmit(form: React.RefObject<HTMLFormElement | null>) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState("");
  const [sent, setSent] = useState(false);

  async function send(input: AccessRequestInput | null, trapped: boolean) {
    setFailure("");
    if (!input) {
      // Focus the first field that says what is wrong with it.
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    if (trapped) {
      setSent(true);
      return;
    }
    setSending(true);
    try {
      await submitAccessRequest(input);
      setSent(true);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "We couldn't send that.");
    } finally {
      setSending(false);
    }
  }
  return { sending, failure, sent, send };
}

function Sent({ title, children }: { title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="rounded-card border border-line bg-paper p-8 outline-none md:p-10">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-done text-paper">
        <Icon name="check" size={20} />
      </span>
      <h2 className="mt-5 font-display text-h2 text-ink">{title}</h2>
      <div className="mt-3 max-w-measure text-body text-muted-fg">{children}</div>
    </div>
  );
}

function Failure({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control bg-blocked-tint px-4 py-3 text-body text-ink">
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------ client */

export function ClientAccessForm({ fromSignIn = false }: { fromSignIn?: boolean }) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [brief, setBrief] = useState("");
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [prefill, setPrefill] = useState<ProviderPrefill | null>(null);
  const [briefCarried, setBriefCarried] = useState(false);
  const { sending, failure, sent, send } = useSubmit(form);

  // What the visitor already told us: the brief from the hero, and the name and email from a
  // Google or Microsoft sign-in that had no account behind it.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(BRIEF_KEY);
      if (saved) {
        setBrief(saved.slice(0, LIMITS.brief));
        setBriefCarried(true);
      }
    } catch {
      // Storage unavailable: the brief starts empty.
    }
    const p = fromSignIn ? takeProviderPrefill() : null;
    if (p) {
      setPrefill(p);
      if (p.name) setName(p.name);
      if (p.email) setEmail(p.email);
    }
  }, [fromSignIn]);

  function validate(): AccessRequestInput | null {
    const next: Errors = {};
    if (!name.trim()) next.name = "Enter your name.";
    if (!email.trim()) next.email = "Enter your work email.";
    else if (!isEmail(email)) next.email = "Enter an email address, like name@company.com.";
    if (!company.trim()) next.company = "Enter your company's name.";
    if (!brief.trim()) next.brief = "Say in a line what the contract is for.";
    setErrors(next);
    if (Object.keys(next).length) return null;
    return { kind: "client_access", name, email, company, brief };
  }

  if (sent) {
    return (
      <Sent title="Request received.">
        <p>
          Thank you. We&apos;ll write to <span className="text-ink">{email.trim()}</span> when your account is ready.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/sample" className="link">
            See a settled document
          </Link>
          <Link href="/" className="link">
            Back to home
          </Link>
        </p>
      </Sent>
    );
  }

  const providerName = prefill?.provider === "azure" ? "Microsoft" : "Google";

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send(validate(), trap.length > 0);
      }}
      className="relative space-y-6 rounded-card border border-line bg-paper p-8 md:p-10"
    >
      {fromSignIn && (
        <p className="rounded-control bg-move-tint px-4 py-3 text-body text-move-text">
          {prefill?.email ? (
            <>
              There&apos;s no Vidhataa account for <span className="font-medium">{prefill.email}</span> yet. Accounts are opened by
              invitation: send this and we&apos;ll set one up for you.
            </>
          ) : (
            <>There&apos;s no Vidhataa account for that {providerName} address yet. Send this and we&apos;ll set one up for you.</>
          )}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Your name" error={errors.name}>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={LIMITS.name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy(`${id}-name`, errors.name)}
          />
        </Field>
        <Field id={`${id}-email`} label="Work email" error={errors.email}>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            value={email}
            maxLength={LIMITS.email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy(`${id}-email`, errors.email)}
          />
        </Field>
      </div>

      <Field id={`${id}-company`} label="Company" error={errors.company}>
        <Input
          id={`${id}-company`}
          value={company}
          maxLength={LIMITS.company}
          onChange={(e) => setCompany(e.target.value)}
          autoComplete="organization"
          aria-invalid={!!errors.company}
          aria-describedby={describedBy(`${id}-company`, errors.company)}
        />
      </Field>

      <Field
        id={`${id}-brief`}
        label="The contract you need"
        hint={briefCarried ? "What you typed on the home page. Change it if you like." : "One line is enough: who it is with and what it covers."}
        error={errors.brief}
      >
        <Textarea
          id={`${id}-brief`}
          value={brief}
          rows={3}
          maxLength={LIMITS.brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Mutual NDA with a vendor in Pune"
          aria-invalid={!!errors.brief}
          aria-describedby={describedBy(`${id}-brief`, errors.brief, true)}
          className="text-body md:text-body"
        />
      </Field>

      <Trap value={trap} onChange={setTrap} />
      <Failure message={failure} />

      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-muted-fg">
          Already have an account?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </p>
        <Button type="submit" size="lg" disabled={sending} aria-busy={sending}>
          {sending ? "Sending…" : "Request access"}
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- advocate */

export function AdvocateApplicationForm() {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    enrolment: "",
    barCouncil: "",
    years: "",
    practice: "",
    message: "",
  });
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const { sending, failure, sent, send } = useSubmit(form);

  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  function validate(): AccessRequestInput | null {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Enter your name as enrolled.";
    if (!values.email.trim()) next.email = "Enter your email.";
    else if (!isEmail(values.email)) next.email = "Enter an email address, like name@chambers.in.";
    if (!values.enrolment.trim()) next.enrolment = "Enter your enrolment number.";
    if (!values.barCouncil) next.barCouncil = "Choose the State Bar Council you are enrolled with.";
    if (values.years.trim() && !/^\d{1,2}$/.test(values.years.trim())) next.years = "Enter a whole number of years.";
    setErrors(next);
    if (Object.keys(next).length) return null;
    return {
      kind: "advocate_application",
      name: values.name,
      email: values.email,
      message: values.message,
      details: {
        "Enrolment number": values.enrolment,
        "State Bar Council": values.barCouncil,
        "Years of practice": values.years,
        "Practice areas": values.practice,
        Phone: values.phone,
      },
    };
  }

  if (sent) {
    return (
      <Sent title="Application received.">
        <p>
          Thank you. We&apos;ll write to <span className="text-ink">{values.email.trim()}</span> about the next step.
        </p>
        <p className="mt-4">
          <Link href="/" className="link">
            Back to home
          </Link>
        </p>
      </Sent>
    );
  }

  const input = (key: keyof typeof values, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={`${id}-${key}`}
      value={values[key]}
      onChange={set(key)}
      aria-invalid={!!errors[key]}
      aria-describedby={describedBy(`${id}-${key}`, errors[key])}
      {...props}
    />
  );

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send(validate(), trap.length > 0);
      }}
      className="relative space-y-6 rounded-card border border-line bg-paper p-8 md:p-10"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Name as enrolled" error={errors.name}>
          {input("name", { autoComplete: "name", maxLength: LIMITS.name })}
        </Field>
        <Field id={`${id}-email`} label="Email" error={errors.email}>
          {input("email", { type: "email", inputMode: "email", autoComplete: "email", maxLength: LIMITS.email })}
        </Field>
        <Field id={`${id}-enrolment`} label="Enrolment number" error={errors.enrolment}>
          {input("enrolment", { maxLength: 60 })}
        </Field>
        <Field id={`${id}-barCouncil`} label="State Bar Council" error={errors.barCouncil}>
          <select
            id={`${id}-barCouncil`}
            value={values.barCouncil}
            onChange={set("barCouncil")}
            aria-invalid={!!errors.barCouncil}
            aria-describedby={describedBy(`${id}-barCouncil`, errors.barCouncil)}
            className="flex h-11 w-full rounded-control border border-line bg-paper px-3 text-base text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent md:text-meta"
          >
            <option value="">Choose a state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-years`} label="Years of practice" optional error={errors.years}>
          {input("years", { inputMode: "numeric", maxLength: 2 })}
        </Field>
        <Field id={`${id}-phone`} label="Phone" optional>
          {input("phone", { type: "tel", autoComplete: "tel", maxLength: 20 })}
        </Field>
      </div>

      <Field id={`${id}-practice`} label="Practice areas" optional>
        {input("practice", { maxLength: 300, placeholder: "Commercial contracts, employment, corporate" })}
      </Field>

      <Field id={`${id}-message`} label="Anything else we should know" optional>
        <Textarea
          id={`${id}-message`}
          value={values.message}
          rows={3}
          maxLength={LIMITS.message}
          onChange={set("message")}
          className="text-body md:text-body"
        />
      </Field>

      <Trap value={trap} onChange={setTrap} />
      <Failure message={failure} />

      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-muted-fg">
          Already empanelled?{" "}
          <Link href="/advocate-login" className="link">
            Sign in
          </Link>
        </p>
        <Button type="submit" size="lg" disabled={sending} aria-busy={sending}>
          {sending ? "Sending…" : "Apply to join"}
        </Button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- agreement */

/**
 * "Tell us you need this", on an agreement that is Coming soon. One field: where to write when it
 * is available.
 */
export function AgreementInterest({ agreement, className }: { agreement: string; className?: string }) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [error, setError] = useState("");
  const { sending, failure, sent, send } = useSubmit(form);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "inline-flex min-h-11 w-fit items-center text-meta font-medium text-ink underline underline-offset-4 transition-colors hover:text-muted-fg",
          className,
        )}
      >
        {sent ? "We'll tell you" : "Tell us you need this"}
        <span className="sr-only">: {agreement}</span>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-display text-h2 font-medium text-ink">{agreement}</DialogTitle>
        {sent ? (
          <DialogDescription className="text-body text-muted-fg" role="status">
            Thank you. We&apos;ll write to {email.trim()} when Vidhataa can draft it.
          </DialogDescription>
        ) : (
          <>
            <DialogDescription className="text-body text-muted-fg">
              Not available yet. Leave your email and we&apos;ll tell you when it is.
            </DialogDescription>
            <form
              ref={form}
              noValidate
              className="relative mt-2 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                let message = "";
                if (!email.trim()) message = "Enter your email.";
                else if (!isEmail(email)) message = "Enter an email address, like name@company.com.";
                setError(message);
                send(message ? null : { kind: "agreement_interest", email, agreement }, trap.length > 0);
              }}
            >
              <Field id={`${id}-email`} label="Email" error={error}>
                <Input
                  id={`${id}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  maxLength={LIMITS.email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={describedBy(`${id}-email`, error)}
                />
              </Field>
              <Trap value={trap} onChange={setTrap} />
              <Failure message={failure} />
              <Button type="submit" className="w-full" disabled={sending} aria-busy={sending}>
                {sending ? "Sending…" : "Tell me when it's ready"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
