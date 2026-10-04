/**
 * Says, on every signed-in page, what the preview is: sample data, with
 * nothing saved or sent. It is not dismissible, because a reader who has
 * closed it once can forget they are not looking at a real matter. It takes
 * its own row above the page rather than floating over it, and it does not
 * print.
 */
export function PreviewBanner() {
  return (
    <aside
      aria-label="Preview notice"
      data-preview-banner
      className="shrink-0 bg-parchment px-4 py-1.5 text-center text-label text-muted-fg print:hidden"
    >
      <p>
        <span className="font-medium text-ink">Preview.</span> Sample data, nothing is saved or sent.
      </p>
    </aside>
  );
}
