import { DOCS_URL, GITHUB_URL } from '@/lib/site'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { BookIcon, GitHubIcon } from './icons'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="ml-auto flex items-center gap-2">
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-2 px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink sm:flex"
          >
            <BookIcon width={15} height={15} />
            Docs
          </a>
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
        </div>
      </div>
    </header>
  )
}
