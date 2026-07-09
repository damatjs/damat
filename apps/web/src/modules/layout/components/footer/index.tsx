import Link from 'next/link'
import { GitHubIcon } from '@/assets/icons/gitHub'
import { DOCS_PATH, GITHUB_URL, REGISTRY_URL } from '@/lib/constants'
import { LogoMark } from '@/modules/layout/components/logo'

const COLUMNS: {
  title: string
  links: { label: string; href: string; external?: boolean }[]
}[] = [
  {
    title: 'Guide',
    links: [
      { label: 'Introduction', href: `${DOCS_PATH}/introduction` },
      { label: 'Getting started', href: `${DOCS_PATH}/getting-started` },
      { label: 'Concepts', href: `${DOCS_PATH}/concepts` },
      { label: 'Configuration', href: `${DOCS_PATH}/configuration` },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Models & ORM', href: `${DOCS_PATH}/models` },
      { label: 'HTTP APIs', href: `${DOCS_PATH}/http-apis` },
      { label: 'Workflows', href: `${DOCS_PATH}/workflows` },
      { label: 'Redis', href: `${DOCS_PATH}/redis` },
    ],
  },
  {
    title: 'Modules',
    links: [
      { label: 'Authoring a module', href: `${DOCS_PATH}/authoring-modules` },
      { label: 'Installing modules', href: `${DOCS_PATH}/installing-modules` },
      { label: 'With AI (MCP)', href: `${DOCS_PATH}/installing-modules-with-ai` },
      { label: 'Module registry', href: REGISTRY_URL, external: true },
    ],
  },
  {
    title: 'Reference',
    links: [
      { label: 'CLI reference', href: `${DOCS_PATH}/cli-reference` },
      { label: 'Packages', href: `${DOCS_PATH}/package-reference` },
      { label: 'Deployment', href: `${DOCS_PATH}/deployment` },
      { label: 'GitHub', href: GITHUB_URL, external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl border-line px-4 py-16 sm:px-6 lg:border-x lg:px-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark />
              <span className="text-base font-semibold tracking-tight text-ink">Damat</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The composable backend framework for TypeScript — assemble exactly
              what your app needs from plug-and-play modules.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <GitHubIcon width={16} height={16} />
              Star on GitHub
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-medium text-ink">{col.title}</p>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-line pt-6 text-sm text-faint sm:flex-row sm:items-center">
          <p>Built with Bun, Hono, Effect-TS, &amp; PostgreSQL.</p>
          <p>MIT Licensed · © {new Date().getFullYear()} Damat</p>
        </div>
      </div>
    </footer>
  )
}
