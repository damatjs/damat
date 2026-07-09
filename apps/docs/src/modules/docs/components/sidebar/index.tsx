"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IconProps } from "@/assets/icons/base";
import { BookIcon } from "@/assets/icons/book";
import { BoxIcon } from "@/assets/icons/box";
import { CloseIcon } from "@/assets/icons/close";
import { ExternalLinkIcon } from "@/assets/icons/externalLink";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { LayersIcon } from "@/assets/icons/layers";
import { MenuIcon } from "@/assets/icons/menu";
import { TerminalIcon } from "@/assets/icons/terminal";
import { useRailThumb } from "@/hooks/useRailThumb";
import { GITHUB_URL, REGISTRY_URL } from "@/lib/site";
import type { NavSection } from "@/lib/types";
import { Logo } from "@/modules/layout/components/logo";

/** Icons for the guide.json section ids; BookIcon is the fallback. */
const SECTION_ICONS: Record<string, ComponentType<IconProps>> = {
  "start-here": BookIcon,
  build: LayersIcon,
  "modules-and-sharing": BoxIcon,
  "operate-and-reference": TerminalIcon,
};

const QUICK_LINKS = [
  { label: "Guide home", href: "/docs", icon: BookIcon },
  {
    label: "Package reference",
    href: "/docs/package-reference",
    icon: BoxIcon,
  },
  { label: "CLI reference", href: "/docs/cli-reference", icon: TerminalIcon },
  {
    label: "Module registry",
    href: REGISTRY_URL,
    icon: ExternalLinkIcon,
    external: true,
  },
  { label: "GitHub", href: GITHUB_URL, icon: GitHubIcon, external: true },
];

function QuickLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {QUICK_LINKS.map((link) => {
        const active = !link.external && pathname === link.href;
        const className = `flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
          active
            ? "bg-subtle font-medium text-ink"
            : "text-muted hover:bg-subtle/70 hover:text-ink"
        }`;
        return (
          <li key={link.label}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className={className}
              >
                <link.icon
                  width={15}
                  height={15}
                  className="shrink-0 text-faint"
                />
                {link.label}
              </a>
            ) : (
              <Link href={link.href} onClick={onNavigate} className={className}>
                <link.icon
                  width={15}
                  height={15}
                  className={`shrink-0 ${active ? "text-brand" : "text-faint"}`}
                />
                {link.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Tailwind-docs style rail tree: icon + group label, bordered lists, and a
 *  single accent thumb that slides to the active chapter on navigation. */
function NavList({
  sections,
  railId,
  onNavigate,
}: {
  sections: NavSection[];
  railId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const trackRef = useRef<HTMLElement>(null);

  useRailThumb(trackRef, railId, pathname);

  return (
    <nav
      ref={trackRef}
      className="relative flex flex-col gap-7"
      aria-label="Docs"
    >
      <span className="rail-thumb" aria-hidden="true" />
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section.id] ?? BookIcon;
        return (
          <div key={section.id}>
            <p className="flex items-center gap-2 px-2 font-mono text-2xs font-medium uppercase tracking-widest text-faint">
              <Icon width={13} height={13} className="shrink-0 text-brand/70" />
              {section.title}
            </p>
            <ul className="ml-2 mt-2.5 border-l border-line">
              {section.chapters.map((chapter) => {
                const href = `/docs/${chapter.slug}`;
                const active = pathname === href;
                return (
                  <li key={chapter.slug}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      data-active={active || undefined}
                      data-rail-indent={9}
                      className={`block py-1 pl-3.5 pr-2 text-sm leading-snug transition-colors ${
                        active
                          ? "font-medium text-ink"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {chapter.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  sections,
  railId,
  onNavigate,
}: {
  sections: NavSection[];
  railId: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <QuickLinks onNavigate={onNavigate} />
      <div className="my-6 border-t border-line" aria-hidden="true" />
      <NavList sections={sections} railId={railId} onNavigate={onNavigate} />
    </>
  );
}

export function Sidebar({ sections }: { sections: NavSection[] }) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto px-4 py-8 lg:block">
      <SidebarContent sections={sections} railId="sidebar" />
    </aside>
  );
}

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname intentionally closes the drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  // Portaled to <body>: the header's backdrop-blur creates a containing block
  // for fixed descendants, which would trap the drawer inside the header bar.
  const drawer =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[90] lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-canvas shadow-2xl animate-fade-in">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
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
                <SidebarContent
                  sections={sections}
                  railId="sidebar-mobile"
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

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
      {drawer}
    </>
  );
}
