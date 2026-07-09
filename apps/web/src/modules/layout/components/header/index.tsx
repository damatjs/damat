import Link from 'next/link'
import { GitHubIcon } from '@/assets/icons/gitHub'
import { DOCS_PATH, GITHUB_URL, REGISTRY_URL } from '@/lib/constants'
import { Logo } from '@/modules/layout/components/logo'
import { ThemeToggle } from '@/modules/layout/components/themeToggle'

const NAV_LINKS = [
  { label: 'Docs', href: DOCS_PATH },
  { label: 'Packages', href: `${DOCS_PATH}/package-reference` },
  { label: 'CLI', href: `${DOCS_PATH}/cli-reference` },
  { label: 'Registry', href: REGISTRY_URL, external: true },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 border-line px-4 sm:px-6 lg:border-x lg:px-10">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="ml-1.5 hidden rounded-full border border-line px-2 py-0.5 font-mono text-2xs font-medium text-faint sm:inline">
            v0.6
          </span>
        </div>

        <nav className="ml-3 hidden items-center md:flex" aria-label="Main">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub repository"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <GitHubIcon width={16} height={16} />
          </a>
          <ThemeToggle />
          <Link
            href={`${DOCS_PATH}/getting-started`}
            className="hidden h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-medium text-canvas transition-opacity hover:opacity-85 md:flex"
          >
            Start building
          </Link>
        </div>
      </div>
    </header>
  )
}
