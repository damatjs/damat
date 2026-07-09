import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getModule, getModuleKeys, installCommand } from '@/lib/registry'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { CopyButton } from '@/components/CopyButton'
import {
  BoxIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  GitHubIcon,
  TagIcon,
} from '@/components/icons'

export function generateStaticParams() {
  return getModuleKeys().map((key) => ({ slug: key.split('/') }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const module = getModule(slug.join('/'))
  if (!module) return {}
  return {
    title: module.key,
    description: module.description ?? `The ${module.key} module for Damat.`,
  }
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-faint">{label}</p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  )
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const module = getModule(slug.join('/'))
  if (!module) notFound()

  const install = installCommand(module, module.latest)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-faint" aria-label="Breadcrumb">
        <Link href="/" className="transition-colors hover:text-ink">
          Registry
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <span className="truncate font-mono text-muted">{module.key}</span>
      </nav>

      {/* Header */}
      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
          <BoxIcon width={26} height={26} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-ink">
              {module.namespace && <span className="text-faint">{module.namespace}/</span>}
              {module.name}
            </h1>
            <VerifiedBadge module={module} />
          </div>
          {module.description && (
            <p className="mt-2 text-[1.05rem] leading-relaxed text-muted">{module.description}</p>
          )}
        </div>
      </div>

      {/* Install */}
      <div className="mt-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Install</p>
        <div className="cmd text-base">
          <span className="truncate text-ink">
            <span className="select-none text-brand">$ </span>
            {install}
          </span>
          <CopyButton text={install} />
        </div>
      </div>

      {/* Meta */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem label="Latest">{module.latest ?? '—'}</MetaItem>
        <MetaItem label="License">{module.license ?? '—'}</MetaItem>
        <MetaItem label="Owner">{module.namespace ?? '—'}</MetaItem>
        <MetaItem label="Verification">
          <span className="capitalize">{module.status}</span>
        </MetaItem>
      </div>

      {/* Keywords */}
      {module.keywords.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Keywords</p>
          <div className="flex flex-wrap gap-2">
            {module.keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-subtle px-2.5 py-1 text-sm text-muted"
              >
                <TagIcon width={13} height={13} className="text-faint" />
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Versions */}
      {module.versions.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Versions</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle/60 text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-4 py-2.5 font-semibold">Version</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 font-semibold">Install</th>
                </tr>
              </thead>
              <tbody>
                {module.versions.map((v) => (
                  <tr key={v.version} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-ink">
                      {v.version}
                      {v.version === module.latest && (
                        <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-brand">
                          latest
                        </span>
                      )}
                    </td>
                    <td className="max-w-0 px-4 py-2.5">
                      <span className="block truncate font-mono text-xs text-muted" title={v.source}>
                        {v.source}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-xs text-muted">
                        {module.installRef}@{v.version}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Links */}
      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
        {module.repository && (
          <a
            href={module.repository}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <GitHubIcon width={15} height={15} />
            Repository
          </a>
        )}
        {module.homepage && (
          <a
            href={module.homepage}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <ExternalLinkIcon width={15} height={15} />
            Homepage
          </a>
        )}
      </div>
    </div>
  )
}
