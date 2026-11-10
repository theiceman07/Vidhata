"use client";

import { useEffect } from "react";

/**
 * Names the browser tab after the page inside the portals.
 *
 * Portal pages are client components and cannot export metadata, so every
 * one of them used to share the site's default title. PageHeader renders
 * this with its own title, in the root layout's "%s · Vidhataa" form.
 */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · Vidhataa`;
  }, [title]);
  return null;
}
