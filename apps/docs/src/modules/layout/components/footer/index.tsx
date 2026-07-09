import { GITHUB_URL, REGISTRY_URL, WEB_URL } from '@/lib/site'

/** Slim docs footer — the full sitemap footer lives on the marketing site. */
export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-shell flex-col justify-between gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <p>MIT Licensed · © {new Date().getFullYear()} Damat</p>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <a href={WEB_URL} className="transition-colors hover:text-ink">
            damatjs.com
          </a>
          <a
            href={REGISTRY_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            Registry
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
  )
}
