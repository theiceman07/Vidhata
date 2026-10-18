"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { requestClientReview, uploadClientContract } from "@/lib/api/client/documents";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { ALLOWED_UPLOAD_TYPES, checkFile } from "@/lib/storage/upload";
import type { ClientDocument } from "@/lib/types";

/**
 * Real backend only: the step between a started draft and a review.
 *
 * The client picks the contract file and uploads it, then asks for the review. Each step can be
 * pressed again after a failure, and a second press while one is running is dropped.
 */
export function UploadContractPanel({
  docId,
  onReviewRequested,
}: {
  docId: string;
  onReviewRequested: (doc: ClientDocument) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedVersion, setUploadedVersion] = useState<number | null>(null);
  const [busy, setBusy] = useState<"upload" | "review" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const inFlight = useRef(false);

  function pick(next: File | null) {
    setUploadedVersion(null);
    setProblem(next ? checkFile(next) : null);
    setFile(next);
  }

  async function run(kind: "upload" | "review", work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    setProblem(null);
    try {
      await work();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That did not go through. Try again.");
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const upload = () =>
    run("upload", async () => {
      if (!file) return;
      const { versionNo } = await uploadClientContract(MOCK_CLIENT_ORG.id, docId, file);
      setUploadedVersion(versionNo);
    });

  const review = () =>
    run("review", async () => {
      onReviewRequested(await requestClientReview(MOCK_CLIENT_ORG.id, docId));
    });

  return (
    <section aria-labelledby="upload-title" className="max-w-xl space-y-4 rounded-card bg-parchment p-5 md:p-6">
      <div>
        <h2 id="upload-title" className="text-h3 text-ink">
          Upload your contract
        </h2>
        <p className="mt-1 text-body text-muted-fg">
          Add the contract you want reviewed. A PDF, DOCX, PNG or JPEG file, up to 25 MB.
        </p>
      </div>

      <div>
        <label htmlFor="contract-file" className="text-label font-medium text-ink">
          Contract file
        </label>
        <input
          id="contract-file"
          type="file"
          accept={ALLOWED_UPLOAD_TYPES.join(",")}
          disabled={busy !== null}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          aria-describedby={problem ? "upload-problem" : undefined}
          className="mt-2 block w-full text-small text-ink"
        />
      </div>

      {problem && (
        <p id="upload-problem" role="alert" aria-live="polite" className="text-small text-flagged">
          {problem}
        </p>
      )}
      {uploadedVersion !== null && (
        <p role="status" className="text-small text-ink">
          Uploaded as draft {uploadedVersion}. You can ask for the review now.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={upload} disabled={!file || checkFile(file) !== null || busy !== null}>
          {busy === "upload" ? "Uploading" : "Upload contract"}
        </Button>
        <Button type="button" variant="outline" onClick={review} disabled={uploadedVersion === null || busy !== null}>
          {busy === "review" ? "Starting the review" : "Request review"}
        </Button>
      </div>
    </section>
  );
}
