import { describe, expect, it, vi } from "vitest";
import { FAILURE_COPY } from "@/lib/net/failure";
import { StorageError, checkFile, getDownloadLink, uploadDocumentFile } from "./upload";

const pdf = () => new File(["%PDF-1.4"], "contract.pdf", { type: "application/pdf" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const base = { apiBase: "https://api.test", token: "tok", documentId: "doc1" };
const startReply = { key: "k", url: "https://s3.test", fields: { key: "k" } };

describe("checkFile", () => {
  it("accepts a PDF and refuses other types and oversize files", () => {
    expect(checkFile({ type: "application/pdf", size: 10 })).toBeNull();
    expect(checkFile({ type: "text/html", size: 10 })).not.toBeNull();
    expect(checkFile({ type: "application/pdf", size: 26 * 1024 * 1024 })).not.toBeNull();
    expect(checkFile({ type: "application/pdf", size: 0 })).not.toBeNull();
  });
});

describe("uploadDocumentFile", () => {
  it("asks the backend, posts to S3 with the file last, then confirms", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/upload-url")) return json({ key: "orgs/o/documents/d/u/contract.pdf", url: "https://s3.test", fields: { key: "k", policy: "p" } });
      if (url === "https://s3.test") return new Response(null, { status: 204 });
      return json({ version_no: 3 });
    }) as unknown as typeof fetch;
    const out = await uploadDocumentFile({ ...base, file: pdf(), fetchImpl });
    expect(out.versionNo).toBe(3);
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.test/documents/doc1/files/upload-url",
      "https://s3.test",
      "https://api.test/documents/doc1/files/confirm",
    ]);
    const names = [...(calls[1].init!.body as FormData).keys()];
    expect(names[names.length - 1]).toBe("file");
    expect((calls[0].init!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });
  it("tells a refusal in fixed words, keeps the server's reason out of the message, and never contacts S3", async () => {
    const fetchImpl = vi.fn(async () => json({ detail: "Files can only be added while the document is a draft or in revision" }, 409)) as unknown as typeof fetch;
    const err = await uploadDocumentFile({ ...base, file: pdf(), fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(StorageError);
    expect(err.message).toBe(FAILURE_COPY.client);
    expect(err.message).not.toMatch(/draft/);
    expect(err.detail).toMatch(/draft or in revision/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("does not confirm when S3 rejects the upload", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith("/upload-url") ? json({ key: "k", url: "https://s3.test", fields: {} }) : new Response("no", { status: 403 }),
    ) as unknown as typeof fetch;
    await expect(uploadDocumentFile({ ...base, file: pdf(), fetchImpl })).rejects.toBeInstanceOf(StorageError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("checks the file before any network call", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(uploadDocumentFile({ ...base, file: new File(["x"], "a.exe", { type: "application/x-msdownload" }), fetchImpl })).rejects.toThrow(/PDF/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("when the upload goes wrong", () => {
  const fail = (fetchImpl: unknown, extra: object = {}) =>
    uploadDocumentFile({ ...base, file: pdf(), fetchImpl: fetchImpl as typeof fetch, ...extra }).catch((e) => e);
  const hangs = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason)));

  it.each([
    [401, "unauthorized"],
    [403, "unauthorized"],
    [413, "too_large"],
    [422, "client"],
    [500, "server"],
  ] as const)("a %i from the backend is told as %s", async (status, kind) => {
    const err = await fail(async () => json({ detail: "internal: boom" }, status));
    expect(err.kind).toBe(kind);
    expect(err.message).not.toMatch(/boom/);
    expect(err.detail).toBe("internal: boom");
  });
  it("wraps a network TypeError in a StorageError, on every step", async () => {
    const down = async () => {
      throw new TypeError("Failed to fetch");
    };
    const first = await fail(down);
    expect(first).toBeInstanceOf(StorageError);
    expect(first.message).toBe(FAILURE_COPY.network);

    const s3Down = async (url: string) => {
      if (url.endsWith("/upload-url")) return json(startReply);
      throw new TypeError("Failed to fetch");
    };
    expect(await fail(s3Down)).toBeInstanceOf(StorageError);

    const confirmDown = async (url: string) => {
      if (url.endsWith("/upload-url")) return json(startReply);
      if (url === "https://s3.test") return new Response(null, { status: 204 });
      throw new TypeError("Failed to fetch");
    };
    expect(await fail(confirmDown)).toBeInstanceOf(StorageError);
  });
  it("gives every call a deadline", async () => {
    const signals: AbortSignal[] = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      signals.push(init!.signal!);
      if (url.endsWith("/upload-url")) return json(startReply);
      if (url === "https://s3.test") return new Response(null, { status: 204 });
      return json({ version_no: 1 });
    };
    await fail(fetchImpl);
    expect(signals).toHaveLength(3);
    expect(signals.every((s) => s instanceof AbortSignal)).toBe(true);
  });
  it("maps a timeout to 'took too long' on the backend call and on the S3 post", async () => {
    const slowApi = await fail(hangs, { timeoutMs: 20 });
    expect(slowApi.message).toBe(FAILURE_COPY.timeout);
    expect(slowApi.kind).toBe("timeout");

    const slowS3 = (url: string, init: RequestInit) => (url.endsWith("/upload-url") ? Promise.resolve(json(startReply)) : hangs(url, init));
    const err = await fail(slowS3, { uploadTimeoutMs: 20 });
    expect(err.kind).toBe("timeout");
    expect(err.message).toBe(FAILURE_COPY.timeout);
  });
  it("does not cut off a slow S3 post with the short backend deadline", async () => {
    const slowS3 = async (url: string) => {
      if (url.endsWith("/upload-url")) return json(startReply);
      if (url === "https://s3.test") {
        await new Promise((r) => setTimeout(r, 60));
        return new Response(null, { status: 204 });
      }
      return json({ version_no: 4 });
    };
    const out = await uploadDocumentFile({ ...base, file: pdf(), fetchImpl: slowS3 as unknown as typeof fetch, timeoutMs: 20, uploadTimeoutMs: 1000 });
    expect(out.versionNo).toBe(4);
  });
  it("tells a failed S3 post plainly, without S3's own body", async () => {
    const fetchImpl = async (url: string) => (url.endsWith("/upload-url") ? json(startReply) : new Response("<Error>SignatureDoesNotMatch</Error>", { status: 403 }));
    const err = await fail(fetchImpl);
    expect(err.message).toBe("The upload did not go through. Try again.");
    expect(err.message).not.toMatch(/Signature/);
  });
  it.each([
    ["no url", { key: "k", fields: {} }],
    ["no key", { url: "https://s3.test", fields: {} }],
    ["no fields", { key: "k", url: "https://s3.test" }],
    ["fields that are not strings", { key: "k", url: "https://s3.test", fields: { a: 1 } }],
    ["a plain http target", { key: "k", url: "http://s3.test", fields: {} }],
    ["a target that is not a URL", { key: "k", url: "not a url", fields: {} }],
    ["a javascript: target", { key: "k", url: "javascript:alert(1)", fields: {} }],
  ])("refuses an upload-url reply with %s, and posts nothing", async (_name, body) => {
    const fetchImpl = vi.fn(async () => json(body));
    const err = await fail(fetchImpl);
    expect(err).toBeInstanceOf(StorageError);
    expect(err.message).toMatch(/could not be read/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["no version_no", {}],
    ["a version_no that is not a number", { version_no: "3" }],
    ["a version_no of zero", { version_no: 0 }],
  ])("refuses a confirm reply with %s", async (_name, body) => {
    const fetchImpl = async (url: string) => {
      if (url.endsWith("/upload-url")) return json(startReply);
      if (url === "https://s3.test") return new Response(null, { status: 204 });
      return json(body);
    };
    expect((await fail(fetchImpl)).message).toMatch(/could not be read/);
  });
  it("refuses a reply that is not JSON", async () => {
    expect((await fail(async () => new Response("<html>", { status: 200 }))).message).toMatch(/could not be read/);
  });
  it("puts the document id in the path safely encoded", async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      urls.push(url);
      if (url.endsWith("/upload-url")) return json(startReply);
      if (url === "https://s3.test") return new Response(null, { status: 204 });
      return json({ version_no: 1 });
    };
    await uploadDocumentFile({ ...base, documentId: "a/b?c#d", file: pdf(), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(urls[0]).toBe("https://api.test/documents/a%2Fb%3Fc%23d/files/upload-url");
    expect(urls[2]).toBe("https://api.test/documents/a%2Fb%3Fc%23d/files/confirm");
  });
});

describe("getDownloadLink", () => {
  it("returns the short-lived link and asks for a version when given one", async () => {
    const fetchImpl = vi.fn(async () => json({ url: "https://s3.test/get", expires_in: 300, version_no: 2 })) as unknown as typeof fetch;
    const out = await getDownloadLink({ ...base, versionNo: 2, fetchImpl });
    expect(out).toEqual({ url: "https://s3.test/get", expiresIn: 300, versionNo: 2 });
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe("https://api.test/documents/doc1/files/download-url?version_no=2");
  });
  it("encodes the document id and tells failures in fixed words", async () => {
    const fetchImpl = vi.fn(async () => json({ detail: "secret internals" }, 404)) as unknown as typeof fetch;
    const err = await getDownloadLink({ ...base, documentId: "a/b", fetchImpl }).catch((e) => e);
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe("https://api.test/documents/a%2Fb/files/download-url");
    expect(err).toBeInstanceOf(StorageError);
    expect(err.message).toBe(FAILURE_COPY.client);
    expect(err.message).not.toMatch(/secret/);
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await getDownloadLink({ ...base, fetchImpl: down }).catch((e) => e)).toBeInstanceOf(StorageError);
  });
  it("refuses a link that is not https or not shaped as expected", async () => {
    const bodies = [
      { url: "http://s3.test/get", expires_in: 300, version_no: 2 },
      { url: "https://s3.test/get", version_no: 2 },
    ];
    for (const body of bodies) {
      const fetchImpl = (async () => json(body)) as unknown as typeof fetch;
      await expect(getDownloadLink({ ...base, fetchImpl })).rejects.toThrow(/could not be read/);
    }
  });
});
