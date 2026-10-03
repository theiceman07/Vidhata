import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

/**
 * Preview only: nothing is sent and nothing is stored. A real inbox replaces
 * this when one exists, and the contact page says so until then.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so the real call has the same shape
export async function sendContactMessage(message: ContactMessage): Promise<void> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send your message.");
  }
}
