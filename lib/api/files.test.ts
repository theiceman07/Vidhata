import { beforeEach, describe, expect, it, vi } from "vitest";

// A signed-in session with a synthetic token. Tests that need no session replace it.
const getSession = vi.fn();
vi.mock("@/lib/auth/supabaseClient", () => ({ getSupabaseClient: () => ({ auth: { getSession } }) }));

import { ApiError } from "@/lib/api/backend";
import { confirmUpload, getDownloadUrl, requestUploadUrl, uploadToS3, type UploadTarget } from "@/lib/api/files";

const DOC = "11111111-1111-4111-8111-111111111111";
const TOKEN = "test-token-not-real";
const file = new File(["%PDF-1.4"], "nda.pdf", { type: "application/pdf" });
const target: UploadTarget = {
  key: `orgs/o/documents/${DOC}/abc-nda.pdf`,
  url: "https://bucket.s3.ap-south-1.amazonaws.com/",
  fields: { "Content-Type": "application/pdf", key: `orgs/o/documents/${DOC}/abc-nda.pdf`, policy: "p", "x-amz-signature": "s" },
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchOf = (...replies: Response[]) => {
  const fn = vi.fn();
  for (const r of replies) fn.mockResolvedValueOnce(r);
  return fn as unknown as typeof fetch & ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: TOKEN } } });
});

describe("requestUploadUrl", () => {
  it("posts the file's facts with the Bearer token and parses the presigned form", async () => {
    const f = fetchOf(json(200, target));
    await expect(requestUploadUrl(DOC, file, f)).resolves.toEqual(target);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`http://localhost:8000/documents/${DOC}/files/upload-url`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(init.body)).toEqual({ filename: "nda.pdf", content_type: "application/pdf", size: file.size });
  });

  it("makes no request without a session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const f = fetchOf();
    await expect(requestUploadUrl(DOC, file, f)).rejects.toMatchObject({ code: "unauthorized" });
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [422, "rejected"],
    [500, "server"],
  ])("surfaces HTTP %i as %s, keeping the server's words in detail only", async (status, code) => {
    const err = await requestUploadUrl(DOC, file, fetchOf(json(status, { detail: "the server's own words" }))).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code, status, detail: "the server's own words" });
    expect(err.message).not.toContain("the server's own words");
  });

  it("refuses a reply that is not the presigned form, and a non-https URL", async () => {
    await expect(requestUploadUrl(DOC, file, fetchOf(json(200, { key: "k" })))).rejects.toMatchObject({ code: "bad_reply" });
    await expect(requestUploadUrl(DOC, file, fetchOf(json(200, { ...target, url: "http://bucket.example/" })))).rejects.toMatchObject({ code: "bad_reply" });
  });

  it("reports a dropped connection as network, without the thrown message", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await requestUploadUrl(DOC, file, f as unknown as typeof fetch).catch((e) => e);
    expect(err).toMatchObject({ code: "network" });
    expect(err.detail).toBeUndefined();
  });
});

describe("uploadToS3", () => {
  it("posts every field first and the file last, with no auth header and no credentials", async () => {
    const f = fetchOf(new Response(null, { status: 204 }));
    await expect(uploadToS3(target, file, f)).resolves.toEqual({ status: 204 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(target.url);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("omit");
    expect(init.headers).toBeUndefined();
    const names = [...(init.body as FormData).keys()];
    expect(names).toEqual([...Object.keys(target.fields), "file"]);
  });

  it("turns an S3 refusal into an error holding only the status", async () => {
    const f = fetchOf(new Response("<Error><Code>AccessDenied</Code><Key>secret-key</Key></Error>", { status: 403 }));
    const err = await uploadToS3(target, file, f).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "rejected", status: 403, detail: "S3 answered 403" });
    expect(JSON.stringify([err.message, err.detail])).not.toContain("secret-key");
  });

  it("reports a failed connection to S3 as network", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("Failed to fetch https://bucket.s3.ap-south-1.amazonaws.com/?X-Amz-Signature=s"));
    const err = await uploadToS3(target, file, f as unknown as typeof fetch).catch((e) => e);
    expect(err).toMatchObject({ code: "network" });
    expect(JSON.stringify([err.message, err.detail])).not.toContain("X-Amz");
  });
});

describe("confirmUpload", () => {
  it("posts the key with the token and returns the version number", async () => {
    const f = fetchOf(json(200, { version_no: 1 }));
    await expect(confirmUpload(DOC, target.key, f)).resolves.toEqual({ versionNo: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`http://localhost:8000/documents/${DOC}/files/confirm`);
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(init.body)).toEqual({ key: target.key });
  });

  it("surfaces 409 (the document no longer accepts files) as conflict", async () => {
    const f = fetchOf(json(409, { detail: "Files cannot be uploaded while the document is 'under_review'" }));
    await expect(confirmUpload(DOC, target.key, f)).rejects.toMatchObject({ code: "conflict", status: 409 });
  });
});

describe("getDownloadUrl", () => {
  it("asks for the version with the token and parses the link", async () => {
    const f = fetchOf(json(200, { url: "https://bucket.s3.ap-south-1.amazonaws.com/x?sig=1", expires_in: 300, version_no: 1 }));
    const link = await getDownloadUrl(DOC, 1, f);
    expect(link).toEqual({ url: "https://bucket.s3.ap-south-1.amazonaws.com/x?sig=1", expiresIn: 300, versionNo: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`http://localhost:8000/documents/${DOC}/files/download-url?version_no=1`);
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("surfaces 404 for a version that does not exist", async () => {
    await expect(getDownloadUrl(DOC, 9, fetchOf(json(404, { detail: "Version not found" })))).rejects.toMatchObject({ code: "not_found" });
  });
});
