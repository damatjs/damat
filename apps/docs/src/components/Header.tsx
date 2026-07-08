'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavSection, SearchDoc } from '@/lib/types'
import { GITHUB_URL } from '@/lib/site'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { SearchDialog } from './Search'
import { MobileNav } from './Sidebar'
import { GitHubIcon, SearchIcon } from './icons'

export function Header({
  sections,
  searchIndex,
}: {
  sections: NavSection[]
  searchIndex: SearchDoc[]
}) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  const navLink = (href: string, label: string) => {
    const active = href === '/docs' ? pathname.startsWith('/docs') : pathname === href
    return (
      <Link
        href={href}
        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
          active ? 'text-ink' : 'text-muted hover:text-ink'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
          scrolled
            ? 'border-line bg-canvas/80 backdrop-blur-md'
            : 'border-transparent bg-canvas/60 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <MobileNav sections={sections} />
            <Logo />
            <span className="ml-2 hidden rounded-full border border-line px-2 py-0.5 text-[0.65rem] font-medium text-faint sm:inline">
              v0.6
            </span>
          </div>

          <nav className="ml-2 hidden items-center md:flex">
            {navLink('/docs', 'Guide')}
            {navLink('/docs/package-reference', 'Packages')}
            {navLink('/docs/cli-reference', 'CLI')}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-line bg-subtle/60 py-1.5 pl-2.5 pr-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink"
              aria-label="Search"
            >
              <SearchIcon width={15} height={15} />
              <span className="hidden lg:inline">Search…</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-line px-1.5 py-0.5 font-mono text-[0.65rem] text-faint lg:flex">
                ⌘K
              </kbd>
            </button>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub repository"
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-subtle hover:text-ink sm:flex"
            >
              <GitHubIcon width={17} height={17} />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <SearchDialog index={searchIndex} open={searchOpen} onClose={closeSearch} />
    </>
  )
}
