/**
 * A guard that refuses re-entry: the first caller is let in, and every other caller is
 * turned away until the first has left.
 *
 * It is for a press that must make one thing happen, such as starting a draft. A piece
 * of React state cannot do it: two presses in the same tick both read the button as idle,
 * because neither has re-rendered yet. A guard held in a ref changes at once.
 *
 * It guards the screen only. A real server needs its own protection (an idempotency key
 * on the request), because a guard in a page does not hold across tabs or retries.
 */
export interface ReentryGuard {
  /** True if the caller is let in, false if someone is already inside. */
  enter(): boolean;
  /** Let the next caller in. Harmless when nobody is inside. */
  leave(): void;
}

export function createReentryGuard(): ReentryGuard {
  let inside = false;
  return {
    enter() {
      if (inside) return false;
      inside = true;
      return true;
    },
    leave() {
      inside = false;
    },
  };
}

/**
 * Run a task if the guard is free, and say whether it ran. A call that finds the guard held
 * does nothing: no request, no toast. The guard is released when the task ends, whether it
 * finishes or fails, and a failure is passed on to the caller.
 */
export async function runExclusive(guard: ReentryGuard, task: () => Promise<unknown>): Promise<boolean> {
  if (!guard.enter()) return false;
  try {
    await task();
    return true;
  } finally {
    guard.leave();
  }
}
