'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavSection } from '@/lib/types'
import { CloseIcon, MenuIcon } from './icons'
import { Logo } from './Logo'

function NavList({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-7">
      {sections.map((section) => (
        <div key={section.id}>
          <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-faint">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.chapters.map((chapter) => {
              const href = `/docs/${chapter.slug}`
              const active = pathname === href
              return (
                <li key={chapter.slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={`relative block rounded-lg px-3 py-1.5 text-[0.875rem] leading-snug transition-colors ${
                      active
                        ? 'bg-brand/10 font-medium text-brand'
                        : 'text-muted hover:bg-subtle hover:text-ink'
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" />
                    )}
                    {chapter.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function Sidebar({ sections }: { sections: NavSection[] }) {
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto py-8 pr-4 lg:block">
      <NavList sections={sections} />
    </aside>
  )
}

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-subtle hover:text-ink lg:hidden"
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-canvas shadow-2xl animate-fade-in">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-subtle hover:text-ink"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <NavList sections={sections} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
