import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * An inline link. Brand green against body text is only 2.1:1, so colour
 * cannot mark it alone: it is underlined at rest, with a visible offset,
 * and the underline thickens on hover (the .link rule in globals.css).
 * The focus ring is the global one.
 */
export function TextLink({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return <Link className={cn("link", className)} {...props} />;
}
