import Link from "next/link";
import { Button } from "@/components/ui/button";

// QA 10.7: "dead-end screens" applies most sharply to error states — a 404
// with no way home is the purest example. Next.js renders this
// automatically for any unmatched route.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
        404
      </p>
      <h1 className="mt-3 font-display text-h1 text-ink">Page not found</h1>
      <p className="mt-3 max-w-prose text-body text-muted-fg">
        This address does not match anything in the product. It may have
        moved, or the link may be out of date.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/documents">Your documents</Link>
        </Button>
      </div>
    </div>
  );
}
