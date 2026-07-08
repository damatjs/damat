'use client'

import { useEffect, useState } from 'react'
import { DOCS_URL, GITHUB_URL } from '@/lib/site'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { BookIcon, GitHubIcon } from './icons'

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled
          ? 'border-line bg-canvas/80 backdrop-blur-md'
          : 'border-transparent bg-canvas/60 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="ml-auto flex items-center gap-2">
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink sm:flex"
          >
            <BookIcon width={15} height={15} />
            Docs
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub repository"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <GitHubIcon width={17} height={17} />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
