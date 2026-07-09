"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { SearchIcon } from "@/assets/icons/search";
import { GITHUB_URL, REGISTRY_URL, WEB_URL } from "@/lib/site";
import type { NavSection, SearchDoc } from "@/lib/types";
import { SearchDialog } from "@/modules/docs/components/search";
import { MobileNav } from "@/modules/docs/components/sidebar";
import { Logo } from "@/modules/layout/components/logo";
import { ThemeToggle } from "@/modules/layout/components/themeToggle";

export function Header({
  sections,
  searchIndex,
}: {
  sections: NavSection[];
  searchIndex: SearchDoc[];
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-2.5 py-1.5 text-sm transition-colors ${
          active ? "text-ink" : "text-muted hover:text-ink"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-shell items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <MobileNav sections={sections} />
            <Logo />
            <span className="hidden rounded-full border border-line px-2 py-0.5 font-mono text-2xs font-medium text-faint sm:inline">
              v0.6
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto flex h-8 items-center gap-2 rounded-full border border-line bg-subtle/60 pl-3 pr-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink md:ml-6 md:w-64"
            aria-label="Search"
          >
            <SearchIcon width={14} height={14} />
            <span className="hidden md:inline">Quick search…</span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-faint md:flex">
              ⌘K
            </kbd>
          </button>

          <nav
            className="hidden items-center md:ml-auto md:flex"
            aria-label="Site"
          >
            {navLink("/docs/package-reference", "Packages")}
            {navLink("/docs/cli-reference", "CLI")}
            <a
              href={REGISTRY_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
            >
              Registry
            </a>
            <a
              href={WEB_URL}
              className="px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
            >
              damatjs.com
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub repository"
              className="hidden h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-subtle hover:text-ink sm:flex"
            >
              <GitHubIcon width={16} height={16} />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <SearchDialog
        index={searchIndex}
        open={searchOpen}
        onClose={closeSearch}
      />
    </>
  );
}
