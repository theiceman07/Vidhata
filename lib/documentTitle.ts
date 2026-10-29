/**
 * A document's title is "Mutual NDA · Kavach Robotics": what it is, then who
 * it is with. The pages under a document name it the way the workspace does,
 * the kind of document as the title and "with" the other side beneath it.
 */
export function documentIdentity(title: string): { name: string; with: string | null } {
  const [name, other] = title.split(" · ");
  return { name, with: other ? `with ${other}` : null };
}
