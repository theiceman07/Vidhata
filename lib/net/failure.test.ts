import { describe, expect, it } from "vitest";
import { FAILURE_COPY, kindOfStatus, kindOfThrown, readDetail } from "./failure";

describe("kindOfStatus", () => {
  it.each([
    [401, "unauthorized"],
    [403, "unauthorized"],
    [413, "too_large"],
    [400, "client"],
    [404, "client"],
    [409, "client"],
    [422, "client"],
    [500, "server"],
    [503, "server"],
  ])("%i is %s", (status, kind) => {
    expect(kindOfStatus(status)).toBe(kind);
  });
});

describe("kindOfThrown", () => {
  it("tells our own deadline from a lost connection", () => {
    expect(kindOfThrown(new DOMException("deadline", "TimeoutError"))).toBe("timeout");
    expect(kindOfThrown(new DOMException("aborted", "AbortError"))).toBe("timeout");
    expect(kindOfThrown(new TypeError("fetch failed"))).toBe("network");
    expect(kindOfThrown(null)).toBe("network");
  });
});

describe("readDetail", () => {
  it("keeps the server's words for debugging, capped", async () => {
    expect(await readDetail(new Response(JSON.stringify({ detail: "Document not found" }), { status: 404 }))).toBe("Document not found");
    expect((await readDetail(new Response(JSON.stringify({ detail: "x".repeat(900) }))))?.length).toBe(500);
  });
  it("is undefined when there is no usable detail", async () => {
    expect(await readDetail(new Response("<html>", { status: 502 }))).toBeUndefined();
    expect(await readDetail(new Response(JSON.stringify({ detail: [{ msg: "bad" }] }), { status: 422 }))).toBeUndefined();
  });
});

describe("FAILURE_COPY", () => {
  it("has a line for every kind and none of them names a status or a server message", () => {
    for (const text of Object.values(FAILURE_COPY)) expect(text).not.toMatch(/\d{3}|detail/i);
  });
});
