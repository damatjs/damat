import Link from 'next/link'
import { ArrowRightIcon } from '@/assets/icons/arrowRight'
import { CheckIcon } from '@/assets/icons/check'
import { DOCS_PATH } from '@/lib/constants'
import { CopyButton } from '@/modules/common/components/copyButton'
import { SectionHeader } from '@/modules/layout/components/sectionHeader'
import { McpPanel } from '@/modules/home/components/registrySection/mcpPanel'

/** Mirrors the live entries in apps/registry/data/registry.json. */
const REGISTRY_MODULES = [
  {
    name: 'damatjs/user',
    version: '0.2.0',
    verified: true,
    description:
      'Authentication, sessions, and accounts — drop-in users, credentials, and session management.',
    install: 'damat module add damatjs/user@0.2.0',
  },
  {
    name: 'billing',
    version: '0.1.0',
    verified: false,
    description:
      'Stripe subscriptions and one-time credits — plans, checkout, webhooks, and a credits ledger.',
    install: 'damat module add billing',
  },
]

export function RegistrySection() {
  return (
    <section className="border-t border-line px-6 py-20 lg:px-10">
      <SectionHeader eyebrow="The registry" title="Modules install like dependencies.">
        Pull a module from the registry, a git URL, or a local path. Every
        registry entry carries an owner and a verification status — gate
        installs with{' '}
        <code className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs text-ink">
          DAMAT_MODULE_VERIFY=require
        </code>
        .
      </SectionHeader>

      <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1fr_0.85fr]">
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {REGISTRY_MODULES.map((mod) => (
            <div key={mod.name} className="bg-canvas p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-md font-medium text-ink">{mod.name}</span>
                <span className="font-mono text-xs text-faint">v{mod.version}</span>
                {mod.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    <CheckIcon width={11} height={11} />
                    Verified
                  </span>
                ) : (
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-faint">
                    Community
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{mod.description}</p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-subtle py-0.5 pl-3 pr-1 font-mono text-code">
                <span className="truncate">
                  <span className="select-none text-brand">$ </span>
                  <span className="text-ink">{mod.install}</span>
                </span>
                <CopyButton text={mod.install} />
              </div>
            </div>
          ))}

          <div className="bg-canvas p-5 sm:p-6">
            <p className="font-mono text-md font-medium text-ink">your-org/your-module</p>
            <p className="mt-2.5 text-sm leading-relaxed text-muted">
              Scaffold a module offline with{' '}
              <code className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs text-ink">
                damat module init
              </code>
              , build and test it on its own, then publish it from any git repo.
            </p>
            <Link
              href={`${DOCS_PATH}/authoring-modules`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
            >
              Author your first module
              <ArrowRightIcon width={13} height={13} />
            </Link>
          </div>
        </div>

        <div className="lg:sticky lg:top-24">
          <McpPanel />
        </div>
      </div>
    </section>
  )
}
