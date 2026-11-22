import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth/supabaseClient", () => ({
  getSupabaseClient: () => ({ auth: { getSession } }),
}));

import {
  addDeclaredConflict,
  declareConflictWithClient,
  removeDeclaredConflict,
} from "@/lib/api/advocate";
import { snapshot } from "@/lib/api/state";
import { NOT_AVAILABLE_YET } from "@/lib/api/unavailable";
import {
  BACKEND_ATTESTATION_NOTE,
  claimAttestationNote,
  NO_SUPPORT_ADDRESS_YET,
  permanentDeclarationNote,
  PREVIEW_DECLARATION_NOTE,
} from "@/lib/claimWording";
import { supportEmail } from "@/lib/config/contact";

const DOC = "11111111-1111-4111-8111-111111111111";
const ME = "33333333-3333-4333-8333-333333333333";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function backend(routes: Record<string, () => Response>) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      const method = init.method ?? "GET";
      calls.push({
        method,
        path,
        body: init.body ? JSON.parse(init.body as string) : undefined,
      });
      const route = routes[`${method} ${path}`];
      return route
        ? route()
        : json(500, { detail: `unrouted ${method} ${path}` });
    }),
  );
  return calls;
}

describe("backend mode: declaring a conflict goes to the backend, not the browser", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "backend");
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_API_URL", "https://api.example.test");
    getSession.mockResolvedValue({
      data: {
        session: { access_token: "test-token-not-real", user: { id: ME } },
      },
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls POST /queue/{id}/declare-conflict and leaves the browser store unchanged", async () => {
    const calls = backend({
      [`POST /queue/${DOC}/declare-conflict`]: () => json(200, { ok: true }),
    });
    const before = JSON.stringify(snapshot());
    await declareConflictWithClient(DOC);
    expect(calls).toEqual([
      {
        method: "POST",
        path: `/queue/${DOC}/declare-conflict`,
        body: { reason: null },
      },
    ]);
    expect(JSON.stringify(snapshot())).toBe(before);
  });

  it("states a refusal from the backend and still writes nothing to the browser", async () => {
    backend({
      [`POST /queue/${DOC}/declare-conflict`]: () =>
        json(404, { detail: "Document not found" }),
    });
    const before = JSON.stringify(snapshot());
    await expect(declareConflictWithClient(DOC)).rejects.toThrow();
    expect(JSON.stringify(snapshot())).toBe(before);
  });

  it("the by-name add and the remove stay unavailable: the route takes a document and there is no remove route", async () => {
    const calls = backend({});
    await expect(addDeclaredConflict("Acme")).rejects.toThrow(
      NOT_AVAILABLE_YET,
    );
    await expect(removeDeclaredConflict("Acme")).rejects.toThrow(
      NOT_AVAILABLE_YET,
    );
    expect(calls).toHaveLength(0);
  });
});

describe("claim dialog wording about the counterparty", () => {
  it("in backend mode says it is the advocate's own attestation and that only client organisations are checked", () => {
    const text = claimAttestationNote(true);
    expect(text).toBe(BACKEND_ATTESTATION_NOTE);
    expect(text).toContain("own attestation");
    expect(text).toContain("The system checks client organisations only");
    expect(text).not.toMatch(
      /counterparty.*(is checked|is verified|recorded)/i,
    );
  });

  it("in the preview keeps its own wording", () => {
    expect(claimAttestationNote(false)).toBe(PREVIEW_DECLARATION_NOTE);
  });
});

describe("before a conflict is confirmed, the advocate is told it is permanent", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("says it is permanent and to contact support, and that no address exists yet when none is set", () => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL", "");
    const text = permanentDeclarationNote(supportEmail());
    expect(text).toContain(
      "This declaration is permanent. Contact support to change it.",
    );
    expect(text).toContain(NO_SUPPORT_ADDRESS_YET);
    expect(text).not.toMatch(/@/);
  });

  it("names the deploy's own address only when one is set", () => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL", "help@example.test");
    const text = permanentDeclarationNote(supportEmail());
    expect(text).toContain(
      "This declaration is permanent. Contact support to change it.",
    );
    expect(text).toContain("help@example.test");
    expect(text).not.toContain(NO_SUPPORT_ADDRESS_YET);
  });
});
