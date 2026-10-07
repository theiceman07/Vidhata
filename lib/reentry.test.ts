import { describe, expect, it } from "vitest";
import { createReentryGuard, runExclusive } from "./reentry";

/** A task that stays pending until the test lets it finish. */
function pending() {
  let finish!: () => void;
  let fail!: (e: Error) => void;
  const done = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  return { done, finish, fail };
}

describe("a guard that refuses re-entry", () => {
  it("lets the first in, refuses the second while the first is inside, and lets one in again after", () => {
    const guard = createReentryGuard();
    expect(guard.enter()).toBe(true);
    expect(guard.enter()).toBe(false);
    expect(guard.enter()).toBe(false);
    guard.leave();
    expect(guard.enter()).toBe(true);
  });

  it("is harmless to leave when nothing is inside", () => {
    const guard = createReentryGuard();
    guard.leave();
    expect(guard.enter()).toBe(true);
  });

  it("is one per guard: another guard is not held by it", () => {
    const a = createReentryGuard();
    const b = createReentryGuard();
    a.enter();
    expect(b.enter()).toBe(true);
  });
});

describe("running a task exclusively", () => {
  it("runs a second call made in the same tick as the first not at all", async () => {
    const guard = createReentryGuard();
    const first = pending();
    let runs = 0;
    const task = () => {
      runs += 1;
      return first.done;
    };

    const a = runExclusive(guard, task);
    const b = runExclusive(guard, task);
    expect(runs).toBe(1);
    expect(await b).toBe(false);
    first.finish();
    expect(await a).toBe(true);
    expect(runs).toBe(1);
  });

  it("lets a call run again once the first has finished", async () => {
    const guard = createReentryGuard();
    let runs = 0;
    await runExclusive(guard, async () => void (runs += 1));
    await runExclusive(guard, async () => void (runs += 1));
    expect(runs).toBe(2);
  });

  it("lets a call run again after the task failed, and still passes the failure on", async () => {
    const guard = createReentryGuard();
    const failing = pending();
    const run = runExclusive(guard, () => failing.done);
    failing.fail(new Error("Could not create the draft."));
    await expect(run).rejects.toThrow("Could not create the draft.");

    let ran = false;
    expect(await runExclusive(guard, async () => void (ran = true))).toBe(true);
    expect(ran).toBe(true);
  });
});
