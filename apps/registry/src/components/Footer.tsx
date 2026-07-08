import { DOCS_URL, GITHUB_URL, SITE } from '@/lib/site'
import { LogoMark } from './Logo'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-subtle/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark width={22} height={22} />
          <span className="text-ink">{SITE.name}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="/index.json" className="transition-colors hover:text-ink">
            index.json
          </a>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            Documentation
          </a>
          <a
            href={`${DOCS_URL}/docs/authoring-modules`}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            Publish a module
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
        <p className="text-faint">© {new Date().getFullYear()} Damat</p>
      </div>
    </footer>
  )
}
