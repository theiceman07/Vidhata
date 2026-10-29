"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/backend";
import { createBackendDocument } from "@/lib/api/backend-documents";
import { confirmUpload, getDownloadUrl, requestUploadUrl, uploadToS3 } from "@/lib/api/files";
import { ALLOWED_UPLOAD_TYPES, checkFile } from "@/lib/storage/upload";

/**
 * Development-only: a first run of the file routes against the real backend and S3.
 * Sign in as the test account, create an NDA document, then upload (request URL -> S3 ->
 * confirm) and download version 1. Each step shows its state and HTTP result. Tokens and
 * presigned URLs are never rendered or logged: the download link is opened and dropped.
 */
type StepState = "idle" | "running" | "ok" | "failed";
interface Step {
  state: StepState;
  note: string;
}
const IDLE: Step = { state: "idle", note: "" };
const STEPS = ["signIn", "create", "request", "s3", "confirm", "download"] as const;
type StepName = (typeof STEPS)[number];
const LABEL: Record<StepName, string> = {
  signIn: "Sign in",
  create: "Create nda document",
  request: "Request upload URL",
  s3: "Upload to S3",
  confirm: "Confirm upload",
  download: "Download version 1",
};

/** What to show for a failure: the fixed message and the HTTP status, never the server's detail. */
function describe(err: unknown): string {
  if (err instanceof ApiError) return `${err.status ? `HTTP ${err.status} · ` : ""}${err.code}: ${err.message}`;
  return err instanceof Error ? err.message : "Failed.";
}

export default function UploadDevPage() {
  const [steps, setSteps] = useState<Record<StepName, Step>>(() => Object.fromEntries(STEPS.map((s) => [s, IDLE])) as Record<StepName, Step>);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (name: StepName, state: StepState, note = "") => setSteps((s) => ({ ...s, [name]: { state, note } }));

  /** Run one step: mark it running, then ok with its note or failed with the description. */
  async function step<T>(name: StepName, run: () => Promise<T>, ok: (v: T) => string): Promise<T | undefined> {
    set(name, "running");
    try {
      const value = await run();
      set(name, "ok", ok(value));
      return value;
    } catch (err) {
      set(name, "failed", describe(err));
      return undefined;
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const user = await step("signIn", () => signInWithPassword(email, password), (u) => `Signed in as ${u.email}`);
    if (user) {
      setSignedInAs(user.email);
      setPassword("");
    }
    setBusy(false);
  }

  async function create() {
    setBusy(true);
    const doc = await step("create", () => createBackendDocument("nda"), (d) => `HTTP 201 · ${d.doc_type} · state ${d.state} · ${d.id}`);
    if (doc) setDocumentId(doc.id);
    setBusy(false);
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    const problem = f ? checkFile(f) : null;
    setFileProblem(problem);
    setFile(problem ? null : f);
  }

  async function upload() {
    if (!documentId || !file) return;
    setBusy(true);
    for (const name of ["request", "s3", "confirm"] as const) set(name, "idle");
    const target = await step("request", () => requestUploadUrl(documentId, file), () => "HTTP 200 · presigned form received");
    const posted = target && (await step("s3", () => uploadToS3(target, file), (r) => `HTTP ${r.status}`));
    if (target && posted) await step("confirm", () => confirmUpload(documentId, target.key), (r) => `HTTP 200 · version ${r.versionNo}`);
    setBusy(false);
  }

  async function download() {
    if (!documentId) return;
    setBusy(true);
    const link = await step("download", () => getDownloadUrl(documentId, 1), (l) => `HTTP 200 · version ${l.versionNo} · link valid ${l.expiresIn}s`);
    if (link) {
      // The link is used once and dropped; it is never rendered or logged.
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10 text-ink">
      <header className="space-y-1">
        <h1 className="font-display text-h2">File routes</h1>
        <p className="text-meta text-muted-fg">Development only. The real backend and S3, signed in as the test account. Nothing here is a mock.</p>
      </header>

      <form onSubmit={signIn} className="space-y-3 rounded-card border border-line p-4">
        <h2 className="text-label text-muted-fg">1 · Sign in</h2>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-control border border-line bg-paper px-3 py-2"
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-control border border-line bg-paper px-3 py-2"
        />
        <Button type="submit" disabled={busy}>
          Sign in
        </Button>
        {signedInAs && <p className="text-meta text-muted-fg">Signed in as {signedInAs}.</p>}
      </form>

      <section className="space-y-3 rounded-card border border-line p-4">
        <h2 className="text-label text-muted-fg">2 · Document</h2>
        <Button type="button" onClick={create} disabled={busy || !signedInAs}>
          Create nda document
        </Button>
        {documentId && <p className="break-all text-meta text-muted-fg">Document {documentId}</p>}
      </section>

      <section className="space-y-3 rounded-card border border-line p-4">
        <h2 className="text-label text-muted-fg">3 · File</h2>
        <input
          type="file"
          accept={[...ALLOWED_UPLOAD_TYPES, ".pdf", ".docx", ".png", ".jpg", ".jpeg"].join(",")}
          onChange={pick}
          className="block w-full text-meta"
        />
        <p className="text-meta text-muted-fg">PDF, DOCX, PNG or JPEG, 25 MB at most.</p>
        {fileProblem && (
          <p role="alert" className="text-meta text-ink">
            {fileProblem}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={upload} disabled={busy || !documentId || !file}>
            Upload
          </Button>
          <Button type="button" variant="outline" onClick={download} disabled={busy || !documentId}>
            Download version 1
          </Button>
        </div>
      </section>

      <section aria-live="polite" className="space-y-2 rounded-card border border-line p-4">
        <h2 className="text-label text-muted-fg">Steps</h2>
        <ol className="space-y-1">
          {STEPS.map((name) => {
            const s = steps[name];
            return (
              <li key={name} className="flex flex-wrap gap-x-3 text-meta">
                <span className="w-44 text-ink">{LABEL[name]}</span>
                <span className={s.state === "ok" ? "text-ink" : s.state === "failed" ? "text-ink" : "text-muted-fg"}>{s.state}</span>
                <span className="break-all text-muted-fg">{s.note}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
