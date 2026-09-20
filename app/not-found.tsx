import Link from "next/link";
import { Button } from "@/components/ui/button";

// QA 10.7: "dead-end screens" applies most sharply to error states — a 404
// with no way home is the purest example. Next.js renders this
// automatically for any unmatched route.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-h1 text-ink">Page not found</p>
      <p className="mt-2 max-w-sm text-body text-muted-fg">
        The page you&apos;re looking for doesn&apos;t exist or may have
        moved.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
