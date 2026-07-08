import Link from 'next/link'
import { GITHUB_URL } from '@/lib/site'
import { LogoMark } from './Logo'
import { GitHubIcon } from './icons'

const cols: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Guide',
    links: [
      { label: 'Introduction', href: '/docs/introduction' },
      { label: 'Getting started', href: '/docs/getting-started' },
      { label: 'Concepts', href: '/docs/concepts' },
      { label: 'Configuration', href: '/docs/configuration' },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Models & ORM', href: '/docs/models' },
      { label: 'HTTP APIs', href: '/docs/http-apis' },
      { label: 'Workflows', href: '/docs/workflows' },
      { label: 'Redis', href: '/docs/redis' },
    ],
  },
  {
    title: 'Modules',
    links: [
      { label: 'Authoring a module', href: '/docs/authoring-modules' },
      { label: 'Installing modules', href: '/docs/installing-modules' },
      { label: 'With AI (MCP)', href: '/docs/installing-modules-with-ai' },
      { label: 'Composing & linking', href: '/docs/composing-and-linking-modules' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { label: 'CLI reference', href: '/docs/cli-reference' },
      { label: 'Packages', href: '/docs/package-reference' },
      { label: 'Deployment', href: '/docs/deployment' },
      { label: 'GitHub', href: GITHUB_URL, external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-line bg-subtle/40">
      <div className="mx-auto max-w-[90rem] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark />
              <span className="text-[1.05rem] font-semibold tracking-tight text-ink">Damat</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A composable backend framework for TypeScript — assemble exactly what your app needs
              from independent, plug-and-play modules.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <GitHubIcon width={16} height={16} />
              Star on GitHub
            </a>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-faint">
                {col.title}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
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

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-sm text-faint sm:flex-row">
          <p>Built with Bun, Hono, Effect-TS, Better Auth &amp; PostgreSQL.</p>
          <p>MIT Licensed · © {new Date().getFullYear()} Damat</p>
        </div>
      </div>
    </footer>
  )
}
