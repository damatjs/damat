'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavSection } from '@/lib/types'
import { CloseIcon } from '@/assets/icons/close'
import { MenuIcon } from '@/assets/icons/menu'
import { Logo } from '@/modules/layout/components/logo'

/** Tailwind-docs style rail tree: group label + bordered list with an
 *  accent-colored active item. */
function NavList({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-7" aria-label="Docs">
      {sections.map((section) => (
        <div key={section.id}>
          <p className="font-mono text-2xs font-medium uppercase tracking-widest text-faint">
            {section.title}
          </p>
          <ul className="mt-2.5 border-l border-line">
            {section.chapters.map((chapter) => {
              const href = `/docs/${chapter.slug}`
              const active = pathname === href
              return (
                <li key={chapter.slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={`-ml-px block border-l-2 py-1 pl-3.5 pr-2 text-sm leading-snug transition-colors ${
                      active
                        ? 'border-brand font-medium text-brand'
                        : 'border-transparent text-muted hover:border-line-strong hover:text-ink'
                    }`}
                  >
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
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto py-9 pl-2 pr-6 lg:block">
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
    document.body.classList.add('overflow-hidden')
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-subtle hover:text-ink lg:hidden"
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
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-subtle hover:text-ink"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <NavList sections={sections} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
