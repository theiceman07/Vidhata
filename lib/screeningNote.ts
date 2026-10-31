/**
 * What a findings count says about the drafts behind it. Zero can mean nothing
 * was screened, or the screened drafts came back clean. Kept apart from
 * lib/findings so a client page can import it: that module is behind the client fence.
 */
export function findingsNote(screened: number): string {
  if (screened === 0) return "No draft screened yet";
  return `Across ${screened} screened ${screened === 1 ? "draft" : "drafts"}`;
}
