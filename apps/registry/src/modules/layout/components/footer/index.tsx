import Link from "next/link";
import { DOCS_URL, GITHUB_URL } from "@/lib/site";

/** Slim footer, matching the docs site. */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-shell flex-col justify-between gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <p>MIT Licensed · © {new Date().getFullYear()} Damat</p>
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
          aria-label="Footer"
        >
          <a
            href="/index.json"
            className="font-mono text-code transition-colors hover:text-ink"
          >
            index.json
          </a>
          <Link href="/publish" className="transition-colors hover:text-ink">
            Publish a module
          </Link>
          <a href={DOCS_URL} className="transition-colors hover:text-ink">
            damatjs.com
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
