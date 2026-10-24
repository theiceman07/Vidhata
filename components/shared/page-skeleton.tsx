import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a page looks like before its data arrives: the same header as
 * PageHeader (the way back, the title, the line under it, the document's tabs)
 * at the same sizes, so when the page lands its title and tabs do not move and
 * only the body fills in. The body is passed in, shaped like the page's own.
 */
export function PageSkeleton({
  tabs = false,
  description = true,
  children,
}: {
  /** The document's tab row is part of the page. */
  tabs?: boolean;
  description?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="w-full" aria-busy="true">
      <span role="status" className="sr-only">
        Loading
      </span>
      <div className="mb-8">
        <div className="mb-1 flex min-h-10 items-center">
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-11 w-80 max-w-full" />
        {description && <Skeleton className="mt-2 h-6 w-[28rem] max-w-full" />}
        {tabs && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[112, 96, 176, 128, 112, 96].map((w, i) => (
              <Skeleton key={i} className="h-9 rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
