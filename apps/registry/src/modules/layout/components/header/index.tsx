"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { DOCS_URL, GITHUB_URL } from "@/lib/site";
import { Logo } from "@/modules/layout/components/logo";
import { ThemeToggle } from "@/modules/layout/components/themeToggle";

export function Header() {
  const pathname = usePathname();

  const navLink = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
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
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-shell items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="ml-3 hidden items-center sm:flex" aria-label="Main">
          {navLink("/modules", "Modules")}
          {navLink("/security", "Security")}
          {navLink("/hosting", "Hosting")}
          {navLink("/agents", "Agents")}
          {navLink("/publish", "Publish")}
          <a
            href={`${DOCS_URL}/docs/installing-modules`}
            className="px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            Docs
          </a>
          <a
            href="/index.json"
            className="px-2.5 py-1.5 font-mono text-code text-muted transition-colors hover:text-ink"
          >
            index.json
          </a>
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
        </div>
      </div>
    </header>
  );
}
