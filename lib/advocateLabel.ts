/**
 * The backend names an advocate only by id until a profile exists, and the API layer fills the name
 * with this placeholder. Read aloud ("Ask Assigned advocate") it is wrong, so the screens that
 * address the advocate say "your advocate" instead. A real name is shown as it is.
 */
const PLACEHOLDER_NAME = "Assigned advocate";

export function advocateLabel(name: string): string {
  return name === PLACEHOLDER_NAME ? "your advocate" : name;
}
