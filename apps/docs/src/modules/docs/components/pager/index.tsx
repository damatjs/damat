import Link from "next/link";
import { ArrowLeftIcon } from "@/assets/icons/arrowLeft";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import type { Chapter } from "@/lib/content";

/** Previous / next chapter links at the bottom of a doc page. */
export function Pager({ prev, next }: { prev?: Chapter; next?: Chapter }) {
  if (!prev && !next) return null;

  return (
    <nav
      className="mt-10 flex items-start justify-between gap-4 border-t border-line pt-6"
      aria-label="Chapters"
    >
      {prev ? (
        <Link href={`/docs/${prev.slug}`} className="group flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <ArrowLeftIcon width={13} height={13} />
            Previous
          </span>
          <span className="text-sm font-medium text-muted transition-colors group-hover:text-brand">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="group flex flex-col items-end gap-1 text-right"
        >
          <span className="flex items-center gap-1.5 text-xs text-faint">
            Next
            <ArrowRightIcon width={13} height={13} />
          </span>
          <span className="text-sm font-medium text-muted transition-colors group-hover:text-brand">
            {next.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
