"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/back-button";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getPrivacy,
  requestDataExport,
  requestDeletion,
  setTrainingOptIn,
  withdrawDeletion,
} from "@/lib/api/privacy";
import {
  DELETION_RECORDED,
  DELETION_SCOPE,
  DELETION_STATUS,
} from "@/lib/config/privacy";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { PrivacyState } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

const stamp = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm");

/**
 * The client's privacy controls: whether their documents may be used to train
 * models, a file of what they may take with them, and a request to delete.
 *
 * Training use is off until they turn it on, and every change is logged. The
 * export holds only what they may read. A deletion is a request and nothing
 * is deleted in this preview, which the screen says in so many words, beside
 * an honest list of what it would remove and what it would not.
 */
export default function PrivacyPage() {
  const [privacy, setPrivacy] = useState<PrivacyState | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setPrivacy(await getPrivacy(MOCK_CLIENT_ORG.id));
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load your privacy settings.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-10 w-56" />
        <div className="mt-10 grid gap-6 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error" || !privacy) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div className="w-full">
      <div className="flex items-start gap-4">
        <BackButton fallbackHref="/settings" label="Settings" />
        <div>
          <h1 className="font-display text-h1 text-ink">Privacy</h1>
          <p className="mt-1 max-w-measure text-body text-muted-fg">
            What Vidhata may do with your documents, what you can take with you, and how to ask
            for deletion.
          </p>
        </div>
      </div>

      <div className="mt-10 grid items-start gap-6 xl:grid-cols-3">
        <TrainingPanel privacy={privacy} onChange={setPrivacy} />
        <ExportPanel />
        <DeletionPanel privacy={privacy} onChange={setPrivacy} />
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-card bg-parchment p-6">
      <h2 id={id} className="font-display text-h3 text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TrainingPanel({
  privacy,
  onChange,
}: {
  privacy: PrivacyState;
  onChange: (next: PrivacyState) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function toggle(granted: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setFailed(null);
    try {
      onChange(await setTrainingOptIn(MOCK_CLIENT_ORG.id, granted));
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Could not save your choice.");
    } finally {
      setSaving(false);
      inFlight.current = false;
    }
  }

  return (
    <Panel id="training-title" title="Training use">
      <p className="mt-2 text-meta text-ink">
        Vidhata does not use your documents to train models unless you opt in. It is off by
        default, and you can turn it off again at any time.
      </p>

      <label
        htmlFor="training-opt-in"
        className="mt-5 flex cursor-pointer items-center gap-3 text-body text-ink"
      >
        <Switch
          id="training-opt-in"
          checked={privacy.trainingOptIn}
          disabled={saving}
          onCheckedChange={toggle}
        />
        {privacy.trainingOptIn ? "On: you have opted in" : "Off"}
      </label>

      {failed && (
        <p role="alert" className="mt-3 text-meta text-flagged">
          {failed}
        </p>
      )}

      <h3 className="mt-6 text-label font-medium text-muted-fg">Consent log</h3>
      {privacy.consentLog.length === 0 ? (
        <p className="mt-2 text-meta text-muted-fg">
          No changes yet. Training use has never been on.
        </p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {[...privacy.consentLog].reverse().map((entry) => (
            <li key={entry.at} className="text-meta text-ink">
              {entry.granted ? "Turned on" : "Turned off"}
              <span className="text-muted-fg"> · {stamp(entry.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-label text-muted-fg">
        This log is kept even if you ask for deletion, so a change you made can be shown to have
        happened.
      </p>
    </Panel>
  );
}

function ExportPanel() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function download() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(null);
    setDone(null);
    try {
      const file = await requestDataExport(MOCK_CLIENT_ORG.id);
      const url = URL.createObjectURL(new Blob([file.contents], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(url);
      setDone(file.fileName);
      toast.success("Export prepared");
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Could not prepare your export.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <Panel id="export-title" title="Export your data">
      <p className="mt-2 text-meta text-ink">
        A file of what you can read in Vidhata: your documents as far as you can read them, your
        invoices, the questions you have asked an advocate, and your consent log.
      </p>
      <p className="mt-2 text-meta text-muted-fg">
        Before a document is signed off, that is only the passages your advocate has asked you
        about. It is a preview file, with sample data.
      </p>

      {failed && (
        <p role="alert" className="mt-3 text-meta text-flagged">
          {failed}
        </p>
      )}
      {done && (
        <p role="status" className="mt-3 text-meta text-ink">
          Prepared as {done}.
        </p>
      )}

      <Button className="mt-5" variant="outline" onClick={download} disabled={busy}>
        {busy ? "Preparing" : failed ? "Try again" : "Export my data"}
      </Button>
    </Panel>
  );
}

function DeletionPanel({
  privacy,
  onChange,
}: {
  privacy: PrivacyState;
  onChange: (next: PrivacyState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(null);
    try {
      onChange(await requestDeletion(MOCK_CLIENT_ORG.id, { understood: true }));
      setOpen(false);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Could not record your request.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  async function withdraw() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(null);
    try {
      onChange(await withdrawDeletion(MOCK_CLIENT_ORG.id));
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Could not withdraw your request.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  const scope = (
    <div className="space-y-5">
      <List title="Would be removed" items={DELETION_SCOPE.removed} />
      <List title="Would be kept" items={DELETION_SCOPE.kept} />
      <List title="Not yet decided" items={DELETION_SCOPE.undecided} />
    </div>
  );

  return (
    <Panel id="delete-title" title="Delete your data">
      <p className="mt-2 inline-flex rounded-full border border-caution/40 px-2.5 py-0.5 text-label font-medium text-caution-fg">
        {DELETION_STATUS}
      </p>
      <p className="mt-3 text-meta text-ink">
        You can ask for your data to be deleted. This is a request. What it would and would not
        remove is below, and the wording is waiting for counsel to confirm it.
      </p>

      <div className="mt-5">{scope}</div>

      {failed && !open && (
        <p role="alert" className="mt-4 text-meta text-flagged">
          {failed}
        </p>
      )}

      {privacy.deletionRequestedAt ? (
        <div role="status" className="mt-6 space-y-2">
          <p className="text-meta font-medium text-ink">{DELETION_RECORDED}</p>
          <p className="text-label text-muted-fg">
            Asked on {stamp(privacy.deletionRequestedAt)}.
          </p>
          <Button variant="outline" size="sm" onClick={withdraw} disabled={busy}>
            Withdraw request
          </Button>
        </div>
      ) : (
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => {
            setUnderstood(false);
            setFailed(null);
            setOpen(true);
          }}
        >
          Request deletion
        </Button>
      )}

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-h-[90svh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request deletion of your data</DialogTitle>
            <DialogDescription>
              {DELETION_STATUS}. Read what would and would not be removed, then confirm. Nothing
              is deleted in this preview.
            </DialogDescription>
          </DialogHeader>

          {scope}

          <div className="flex items-start gap-3">
            <Checkbox
              id="deletion-understood"
              checked={understood}
              onCheckedChange={(v) => setUnderstood(v === true)}
              disabled={busy}
              className="mt-1"
            />
            <label htmlFor="deletion-understood" className="text-body text-ink">
              I have read what would be removed and what would be kept, and I understand the
              wording is pending counsel confirmation.
            </label>
          </div>

          {failed && (
            <p role="alert" className="text-meta text-flagged">
              {failed}
            </p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={busy || !understood}>
              {busy ? "Recording" : "Confirm deletion request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function List({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-label font-medium text-muted-fg">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-meta text-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
